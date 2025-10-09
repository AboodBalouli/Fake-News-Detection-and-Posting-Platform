from fastapi import Depends, FastAPI, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime, timedelta
import database  # Simple database connection
from auth import get_password_hash, verify_password, create_access_token, verify_token, authenticate_user
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os,shutil
from ml_service import predict_fake_news
from training_service import TrainingException, retrain_models

# Security scheme for JWT tokens
security = HTTPBearer()

class CommentCreate(BaseModel):
    content: str  # Only content needed - user_id comes from JWT, post_id from URL
    
class UserCreate(BaseModel):
    username: str
    name: str
    email: str
    password: str
    pfp_filename: Optional[str] = None
    
class UserLogin(BaseModel):
    username: str
    password: str

class ArticleCreate(BaseModel):
    title: str
    content: str
    image_filename: Optional[str] = None  # Store filename from upload step

    
class Token(BaseModel):
    access_token: str
    token_type: str
    
class FeedbackCreate(BaseModel):
    reported_as: str  # 'fake' or 'real'
    comment: Optional[str] = None  # Optional reason for reporting
    
class FeedbackResponse(BaseModel):
    id: int
    status: str
    created_at: datetime
    message: str

class AdminFeedbackList(BaseModel):
    id: int
    post_id: int
    post_title: str
    post_content: str
    post_author: str
    user_id: int  
    username: str
    name: str
    email: str
    pfp_filename: Optional[str] = None
    ml_prediction: Optional[str]
    ml_confidence: Optional[float]
    reported_as: str  
    comment: Optional[str]
    reporter_name: str
    created_at: datetime
    status: str  


class AdminUserSummary(BaseModel):
    id: int
    username: str
    name: str
    email: str
    role: str


class AdminPostSummary(BaseModel):
    id: int
    title: str
    author_id: int
    author_name: str
    author_email: str
    created_at: datetime
    prediction: Optional[str]
    confidence: Optional[float]
    approved: bool

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    username = verify_token(token)
    
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    
    # admin middleware - checks if current user has admin role
    # this creates a dependency chain: JWT → User → Admin Check
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. Only administrators can access this resource."
        )
    return current_user

@app.get("/api/posts/upvotes")
def get_user_upvotes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Get all posts that this user has upvoted
    user_upvotes = db.query(models.Upvote).filter(
        models.Upvote.user_id == current_user.id
    ).all()
    
    # Get upvote counts for all posts
    upvote_counts = db.query(
        models.Upvote.post_id,
        func.count(models.Upvote.id).label('count')
    ).group_by(models.Upvote.post_id).all()
    
    # Create response format
    result = {}
    
    # Add counts for all posts
    for post_id, count in upvote_counts:
        result[post_id] = {
            "count": count,
            "user_voted": False
        }
    
    # Mark posts that this user voted on
    for upvote in user_upvotes:
        if upvote.post_id in result:
            result[upvote.post_id]["user_voted"] = True
        else:
            result[upvote.post_id] = {
                "count": 1,
                "user_voted": True
            }
    
    return {"upvotes": result}

@app.post("/api/posts/{post_id}/upvotes")
def handle_upvotes(
    post_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
    ):
    
    existing = (
    db.query(models.Upvote)
    .filter(
        models.Upvote.post_id == post_id,
        models.Upvote.user_id == current_user.id
    ).first())
    user_voted = True
    if existing:
        db.delete(existing)
        db.commit() 
        user_voted = False
    else:
        new_upvote = models.Upvote(
            user_id=current_user.id,  # From JWT authentication
            post_id=post_id, # from url
        )
        
        db.add(new_upvote)
        db.commit()
        db.refresh(new_upvote)
        
    count = (
        db.query(func.count(models.Upvote.id))
        .filter(models.Upvote.post_id == post_id)
        .scalar()
    )
    return {"upvotes": count, "user_vote": user_voted}

@app.get("/api/posts/{post_id}/comments")
def get_comments(post_id: int, db: Session = Depends(database.get_db)):
    # Get comments for specific post only
    comments = db.query(models.Comment).join(models.User).filter(
        models.Comment.post_id == post_id
    ).order_by(models.Comment.date.desc()).all()
    
    comments_to_show = []
    for comment in comments:
        comments_to_show.append({
            "id": comment.id,
            "author": comment.user.name,
            "author_pfp": comment.user.pfp,  # include commenter profile picture
            "content": comment.content,
            "timestamp": comment.date.strftime("%m/%d/%Y, %I:%M:%S %p"),
        })
    return {"comments": comments_to_show}
        

@app.post("/api/posts/{post_id}/comments")
def create_comment(
    post_id: int,
    comment: CommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)):
    # Check if post exists
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    new_comment = models.Comment(
        user_id=current_user.id,  # From JWT authentication
        post_id=post_id,          # From URL path
        content=comment.content,   # From request body
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return {
        "message": "Comment saved successfully", 
        "comment": {
            "id": new_comment.id,
            "content": new_comment.content,
            "author": current_user.name,
            "author_pfp": current_user.pfp,  # include profile picture in response
            "timestamp": new_comment.date.strftime("%m/%d/%Y, %I:%M:%S %p")
        }
    }
    

@app.get("/api/user_name")
def get_user_name(current_user: models.User = Depends(get_current_user)):
    return {
        "user_name": current_user.name,
        "user_pfp": current_user.pfp,
        "user_id": current_user.id,
        "role": current_user.role
    }

@app.post("/api/login")
def login_user(user: UserLogin, db: Session = Depends(database.get_db)):
    # authenticate user
    authenticated_user = authenticate_user(db, user.username, user.password)
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": authenticated_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": authenticated_user.id,
            "username": authenticated_user.username,
            "name": authenticated_user.name,
            "email": authenticated_user.email,
            "pfp": authenticated_user.pfp,
            "role": authenticated_user.role
        }
    }

@app.post("/api/upload-profile-picture")
async def upload_profile_picture(file: UploadFile = File(...)):
    # upload a profile picture and return the filename
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs("profile_pictures", exist_ok=True)
    
    # Generate unique filename for profile picture
    import uuid
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"pfp_{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join("profile_pictures", unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile picture: {str(e)}")

@app.get("/api/profile-pictures/{filename}")
async def get_profile_picture(filename: str):
    # serve uploaded profile pictures
    file_path = os.path.join("profile_pictures", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        raise HTTPException(status_code=404, detail="Profile picture not found")

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(database.get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    
    if existing_user:  # Fixed: check existing_user, not user
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists.",
        )
    
    
    hashed_password = get_password_hash(user.password) 
    
    new_user = models.User(  
        username=user.username,  
        name=user.name,
        email=user.email,
        password=hashed_password,  # put the hashed password not the plain password you dumbass, abood
        pfp=user.pfp_filename  # profile picture filename from upload step
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id}
        

@app.get("/")
def read_root():
    return {"message": "hello there"}

@app.get("/api/db-test")
def test_database():
    """Simple endpoint to test database connection"""
    try:
        # Test database connection
        with database.engine.connect() as connection:
            result = connection.execute(database.text("SELECT 1"))
            return {"status": "Database connected successfully!", "test_query": "OK"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

@app.get("/api/test")
def test_endpoint():
    return {"status": "FastAPI is working"}

@app.get("/api/articles")
def get_articles(db: Session = Depends(database.get_db)):
    posts = db.query(models.Post).join(models.User).all()
    articles = []
    for post in posts:
        articles.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "image": post.image,
            "timestamp": post.date.strftime("%m/%d/%Y, %I:%M:%S %p"),
            "author": post.author.name,
            "author_pfp": post.author.pfp,  
            "prediction": post.prediction,
            "confidence": post.confidence,
            "approved": post.approved,
        })
    return {"articles": articles}

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # upload an image file and return the filename
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    
    if not file.content_type.startswith('image/'): # check the file type
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs("uploads", exist_ok=True)
    
    # Generate unique filename
    import uuid # idk what the fuck is this i just copy pasted it from chatgpt but i think it's for generating names for the pics
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join("uploads", unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.get("/api/images/{filename}")
async def get_image(filename: str):
    # serve uploaded images
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        raise HTTPException(status_code=404, detail="Image not found")

@app.post("/api/articles")
def create_article(
    article: ArticleCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    ml = predict_fake_news(article.content)
    new_article = models.Post(
        title=article.title,
        content=article.content,
        image=article.image_filename,  # file name only
        author_id=current_user.id,
        prediction=ml["prediction"],
        confidence=ml["confidence"],
    )

    
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    
    return {"message": "Article created successfully", "article": new_article}

@app.post("/api/posts/{post_id}/report")
def report_post(
    post_id: int,
    feedback: FeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    current_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    
    if not current_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user already reported this post
    existing_feedback = db.query(models.UserFeedback).filter(
        models.UserFeedback.post_id == post_id,
        models.UserFeedback.user_id == current_user.id
    ).first()

    if existing_feedback:
        raise HTTPException(status_code=400, detail="You have already reported this post")
    
    new_feedback = models.UserFeedback(
        post_id = post_id,
        user_id = current_user.id,
        predicted_label = current_post.prediction,
        reported_as = feedback.reported_as,
        comment = feedback.comment,
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return FeedbackResponse(
        id=new_feedback.id,
        status=new_feedback.status,
        created_at=new_feedback.created_at,
        message="Report submitted successfully"
    )
    
@app.get("/api/admin/feedback", response_model=List[AdminFeedbackList]) # response model is important here ya abood because it's for type safety and validation, for example, if you want to query all users then return them, it won't return what's not in the response model
def get_pending_feedback(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)
):
    feedback_list = db.query(models.UserFeedback)\
    .join(models.Post)\
    .join(models.User)\
    .filter(models.UserFeedback.status == 'pending')\
    .all()
    
    result = []
    
    for feedback in feedback_list:
        result.append(AdminFeedbackList(
            id=feedback.id,
            post_id=feedback.post_id,
            post_title=feedback.post.title,
            post_content=feedback.post.content,
            post_author=feedback.post.author.name,
            user_id=feedback.user.id,
            username=feedback.user.username,
            name=feedback.user.name,
            reporter_name=feedback.user.name,  
            email=feedback.user.email,
            pfp_filename=feedback.user.pfp,
            ml_prediction=feedback.predicted_label,  
            ml_confidence=feedback.post.confidence,  
            reported_as=feedback.reported_as,  
            comment=feedback.comment,
            created_at=feedback.created_at,    
            status=feedback.status             
        ))
    
    return result


@app.get("/api/admin/users", response_model=List[AdminUserSummary])
def list_users(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)
):
    users = db.query(models.User).order_by(models.User.id).all()
    return [
        AdminUserSummary(
            id=user.id,
            username=user.username,
            name=user.name,
            email=user.email,
            role=user.role,
        )
        for user in users
    ]


@app.delete("/api/admin/users/{user_id}")
def delete_user(
    user_id: int,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Admins cannot delete their own account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


@app.get("/api/admin/posts", response_model=List[AdminPostSummary])
def list_posts(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)
):
    posts = (
        db.query(models.Post)
        .join(models.User, models.Post.author_id == models.User.id)
        .all()
    )
    summaries = []
    
    for post in posts:
        author = post.author
        print(post.id)
        print(post.author)
        
        confidence = float(post.confidence) if post.confidence is not None else None
        summaries.append(
            AdminPostSummary(
                id=post.id,
                title=post.title,
                author_id=author.id,
                author_name=author.name,
                author_email=author.email,
                created_at=post.date,
                prediction=post.prediction,
                confidence=confidence,
                approved=post.approved if post.approved else False,
            )
        )

    return summaries


@app.delete("/api/admin/posts/{post_id}")
def delete_post(
    post_id: int,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()

    return {"message": "Post deleted successfully"}

@app.put("/api/admin/feedback/{feedback_id}/approve")
def approve_feedback(
    feedback_id: int,
    action: str, # approve or reject
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db)):
    existing_article = db.query(models.UserFeedback).filter(models.UserFeedback.id == feedback_id).first()
    if existing_article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="article not found")
    
    existing_article.status = action
    existing_article.approved_by_admin_id = admin_user.id
    
    if action == "approved":
        training_data = models.TrainingData(
            post_id=existing_article.post_id,
            label=existing_article.reported_as,  # user's feedback becomes truth
            approved_by_admin_id=admin_user.id
        )
        db.add(training_data)
        
        post = db.query(models.Post).filter(models.Post.id == existing_article.post_id).first()
        post.approved = True
    
    db.commit()
    db.refresh(existing_article)
    
    return {"message": "Article updated successfully", "article": existing_article}    


@app.post("/api/admin/retrain")
def retrain_models_endpoint(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(database.get_db),
):
    try:
        metrics = retrain_models(db)
        return {
            "message": "Models retrained successfully",
            "metrics": metrics,
        }
    except TrainingException as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safety net
        raise HTTPException(status_code=500, detail="Failed to retrain models") from exc