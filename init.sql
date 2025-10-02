-- Create the database if it doesn't exist
-- This script is automatically run by PostgreSQL on container startup

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance (will be created after tables exist)
-- These are examples - adjust based on your actual table structure

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE fake_news_db TO fake_news_user;

-- You can add any additional initialization SQL here