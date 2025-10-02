# models.py
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, TIMESTAMP
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

    # relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="user", cascade="all, delete-orphan")


# Posts table
class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fact_check = Column(Boolean, default=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    date = Column(TIMESTAMP(timezone=True), server_default=func.now())
    image = Column(String(255), nullable=True)  # Stores filename like "image_123.jpg"

    # relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="post", cascade="all, delete-orphan")


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
