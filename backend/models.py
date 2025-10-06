# models.py
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, TIMESTAMP, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# Users table
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  
    pfp = Column(String(255), nullable=True)  
    role = Column(String(20), nullable=False, default='user')  # 'user' or 'admin'

    # relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("UserFeedback", foreign_keys="UserFeedback.user_id", back_populates="user", cascade="all, delete-orphan")


# Posts table
class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # fact_check = Column(Boolean, default=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    date = Column(TIMESTAMP(timezone=True), server_default=func.now())
    image = Column(String(255), nullable=True)  # Stores filename like "image_123.jpg"
    prediction = Column(String(10), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    approved = Column(Boolean, default=False)  # Admin approval status
    
    # relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="post", cascade="all, delete-orphan")
    feedback = relationship("UserFeedback", back_populates="post", cascade="all, delete-orphan")


# Comments table
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    date = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # relationships
    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")


# Upvotes table
class Upvote(Base):
    __tablename__ = "upvotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    date = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # relationships
    user = relationship("User", back_populates="upvotes")
    post = relationship("Post", back_populates="upvotes")


# User Feedback table
class UserFeedback(Base):
    __tablename__ = "user_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    predicted_label = Column(String(10), nullable=True)  # What the ML model predicted
    reported_as = Column(String(10), nullable=False)   # What the user thinks: 'fake' or 'real'
    comment = Column(Text, nullable=True)                # Optional reason for the report
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String(20), nullable=False, default='pending')  # pending, approved, rejected
    approved_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # relationships
    post = relationship("Post", back_populates="feedback")
    user = relationship("User", foreign_keys=[user_id], back_populates="feedback")
    approved_by_admin = relationship("User", foreign_keys=[approved_by_admin_id])


# Training Data table
class TrainingData(Base):
    __tablename__ = "training_data"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(10), nullable=False)           # Final approved label (fake or real)
    source = Column(String(20), nullable=False, default='user_feedback')  # Could be 'original', 'manual', etc.
    added_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    approved_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # relationship
    post = relationship("Post")
