// import { ReactNode } from "react};
import { useState, useEffect } from "react";
import Default_pfp from "../assets/Default_pfp.jpg";
import { useNavigate } from "react-router-dom";

// type definition for article props passed from parent component
interface Props {
  // children: ReactNode;
  articles: Array<{
    id: number;
    title: string;
    content: string;
    image: string;
    timestamp: string;
    author?: string;
    author_pfp?: string; // profile picture filename
  }>;
}

const ArticleList = ({ articles }: Props) => {
  // ===== NAVIGATION SETUP =====
  const navigate = useNavigate();

  // ===== STATE MANAGEMENT =====
  // tracks which articles are expanded to show full content vs truncated
  const [expandedArticles, setExpandedArticles] = useState(new Set());

  // stores upvote count and user voting status for each article
  const [upvotes, setUpvotes] = useState<{
    [key: number]: { count: number; userVoted: boolean };
  }>({});

  // stores comment arrays for each article with id, text, author, timestamp, profile picture
  const [comments, setComments] = useState<{
    [key: number]: Array<{
      id: number;
      text: string;
      author: string;
      timestamp: string;
      author_pfp?: string; // profile picture filename
    }>;
  }>({});

  // tracks which articles have their comment sections visible
  const [showComments, setShowComments] = useState<Set<number>>(new Set());

  // stores the input text for new comments being typed for each article
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});

  // tracks which articles show all comments vs just first 2
  const [expandedComments, setExpandedComments] = useState<Set<number>>(
    new Set()
  );

  // ===== API FUNCTIONS =====
  // fetches all comments for a specific article from the backend API
  const fetchComments = async (articleId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/posts/${articleId}/comments`
      );
      if (response.ok) {
        const data = await response.json();
        setComments((prev) => ({
          ...prev,
          [articleId]: data.comments.map((comment: any) => ({
            id: comment.id,
            text: comment.content,
            author: comment.author,
            timestamp: comment.timestamp,
            author_pfp: comment.author_pfp, // include profile picture
          })),
        }));
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  // fetches current user's upvote status for all articles from backend API
  const fetchUpvoteState = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUpvotes({});
        return;
      }

      const response = await fetch("http://localhost:8000/api/posts/upvotes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUpvotes(data.upvotes);
      } else {
        setUpvotes({});
      }
    } catch (error) {
      console.error("Failed to fetch upvote state:", error);
      setUpvotes({});
    }
  };

  // ===== UTILITY FUNCTIONS =====
  // gets profile picture URL or returns default cattos image
  const getProfilePictureUrl = (pfpFilename?: string) => {
    if (pfpFilename) {
      return `http://localhost:8000/api/profile-pictures/${pfpFilename}`;
    }
    return Default_pfp; // default fallback image
  };

  // converts timestamp to human readable format like "5 minutes ago", "2 hours ago"
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffInMs = now.getTime() - posted.getTime();

    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;

    return timestamp; // just use the original timestamp if the post is too old
  };

  // ===== NAVIGATION HANDLERS =====
  // navigates to the post creation page when "post first article" button is clicked
  const handleButton = () => {
    navigate("/post");
  };

  // ===== TOGGLE FUNCTIONS =====
  // toggles between showing full article content vs truncated version
  const toggleExpanded = (articleId: number) => {
    const newExpanded = new Set(expandedArticles); // copy current set
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId); // remove if exists (collapse)
    } else {
      newExpanded.add(articleId); // add if doesn't exist (expand)
    }
    setExpandedArticles(newExpanded);
  };

  // shows/hides comment section and fetches comments when opening
  const toggleComments = (articleId: number) => {
    const newShowComments = new Set(showComments);
    if (newShowComments.has(articleId)) {
      newShowComments.delete(articleId);
    } else {
      newShowComments.add(articleId);
      // fetch comments when expanding comments section
      fetchComments(articleId);
    }
    setShowComments(newShowComments);
  };

  // toggles between showing all comments vs just first 2 comments
  const toggleExpandedComments = (articleId: number) => {
    const newExpandedComments = new Set(expandedComments);
    if (newExpandedComments.has(articleId)) {
      newExpandedComments.delete(articleId);
    } else {
      newExpandedComments.add(articleId);
    }
    setExpandedComments(newExpandedComments);
  };

  // ===== ACTION HANDLERS =====
  // toggles upvote for an article, calls API and updates local state
  const handleUpvote = async (articleId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/posts/${articleId}/upvotes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();

        setUpvotes((prev) => {
          const newData = {
            ...prev,
            [articleId]: {
              count: data.upvotes,
              userVoted: data.user_vote,
            },
          };

          return newData;
        });
      }
    } catch (error) {
      console.error("Upvote API error:", error);
    }
  };

  // posts a new comment to an article, updates local state, clears input field
  const handleAddComment = async (articleId: number) => {
    const commentText = newComment[articleId]?.trim();
    if (!commentText) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/posts/${articleId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ content: commentText }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // add the new comment to state immediately
        setComments((prev) => ({
          ...prev,
          [articleId]: [
            ...(prev[articleId] || []),
            {
              id: data.comment.id,
              text: data.comment.content,
              author: data.comment.author,
              timestamp: data.comment.timestamp,
              author_pfp: data.comment.author_pfp, // include profile picture
            },
          ],
        }));

        // clear the input field
        setNewComment((prev) => ({ ...prev, [articleId]: "" }));
      } else {
        const error = await response.json();
        alert(
          `Failed to post comment: ${error.detail || "Please login first"}`
        );
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Network error. Please check if the backend is running.");
    }
  };

  // ===== EFFECTS =====
  // loads user's upvote state when component first mounts
  useEffect(() => {
    fetchUpvoteState();
  }, []);

  // re-fetches upvote state when user returns to tab or window (handles login/logout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUpvoteState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", fetchUpvoteState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", fetchUpvoteState);
    };
  }, []);

  // ===== RENDER =====

  return (
    <div className="w-75 mx-auto">
      {/* empty state when no articles exist */}
      {articles.length === 0 && (
        <div className="text-center py-5">
          <div className="mb-4">
            <i
              className="fas fa-newspaper"
              style={{ fontSize: "4rem", color: "#6c757d" }}
            ></i>
          </div>
          <h4 className="text-muted mb-3">No articles yet!</h4>
          <p className="text-muted mb-4">
            Share your first news article with the FactChecker community!
          </p>
          <button onClick={handleButton} className="btn btn-primary btn-lg">
            ✍️ Post Your First Article
          </button>
        </div>
      )}

      {/* article list - render newest first */}
      {[...articles].reverse().map((article) => (
        <div
          key={article.id}
          className="card shadow-sm border-0 rounded-3 mb-4"
        >
          <div className="card-body">
            {/* article header with author info and timestamp */}
            <div className="d-flex align-items-center mb-3">
              <img
                src={getProfilePictureUrl((article as any).author_pfp)}
                className="rounded-circle me-2"
                alt="User"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.src = Default_pfp; // fallback to default on error
                }}
              />
              <div>
                <h6 className="mb-0 fw-bold">
                  {(article as any).author || "Abood"}
                </h6>
                <small className="text-muted">
                  Posted {getTimeAgo(article.timestamp)}
                </small>
                <p className="card-text">{article.title}</p>
              </div>
            </div>

            {/* article content with expand/collapse functionality */}
            <p className="card-text">
              {
                expandedArticles.has(article.id) ||
                article.content.length <= 100
                  ? article.content
                  : `${article.content.substring(0, 100)}... ` // show first 100 chars
              }
              {article.content.length > 100 && (
                <button
                  onClick={() => toggleExpanded(article.id)}
                  className="btn btn-link p-0"
                >
                  {expandedArticles.has(article.id) ? "Show Less" : "Read More"}
                </button>
              )}
            </p>

            {/* article image with error handling */}
            {article.image && (
              <img
                src={`http://localhost:8000/api/images/${article.image}`}
                className="img-fluid rounded mb-3"
                style={{
                  maxHeight: "500px",
                  width: "100%",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {!article.image && <div className="mb-3"></div>}

            {/* action buttons: upvote, comment, fact check */}
            <div className="d-flex justify-content-between pt-2 border-top mt-3">
              <button
                className={`btn btn-sm ${
                  upvotes[article.id]?.userVoted ? "btn-primary" : "btn-light"
                }`}
                onClick={() => handleUpvote(article.id)}
              >
                👍 {upvotes[article.id]?.userVoted ? "Upvoted" : "Upvote"} (
                {upvotes[article.id]?.count || 0})
              </button>
              <button
                className={`btn btn-sm ${
                  showComments.has(article.id) ? "btn-primary" : "btn-light"
                }`}
                onClick={() => toggleComments(article.id)}
              >
                💬 Comment ({comments[article.id]?.length || 0})
              </button>
              <button className="btn btn-light btn-sm">Fact Check</button>{" "}
              {/* i'll put factchecker functionality later */}
            </div>

            {/* comments section - only visible when toggled */}
            {showComments.has(article.id) && (
              <div className="mt-3 pt-3 border-top">
                {/* comment input form */}
                <div className="d-flex gap-2 mb-3">
                  <img
                    src={getProfilePictureUrl(
                      JSON.parse(localStorage.getItem("user") || "{}").pfp
                    )}
                    className="rounded-circle"
                    alt="User"
                    style={{
                      width: "32px",
                      height: "32px",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.currentTarget.src = Default_pfp; // fallback to default
                    }}
                  />
                  <div className="flex-grow-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Write a comment..."
                      value={newComment[article.id] || ""}
                      onChange={(e) =>
                        setNewComment((prev) => ({
                          ...prev,
                          [article.id]: e.target.value,
                        }))
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(article.id);
                        }
                      }}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddComment(article.id)}
                    disabled={!newComment[article.id]?.trim()}
                  >
                    Post
                  </button>
                </div>

                {/* comment display logic with expand/collapse */}
                {(() => {
                  const articleComments = [
                    ...(comments[article.id] || []),
                  ].reverse();
                  const isExpanded = expandedComments.has(article.id);
                  const commentsToShow = isExpanded
                    ? articleComments
                    : articleComments.slice(0, 2);

                  return (
                    <>
                      {/* render visible comments */}
                      {commentsToShow.map((comment) => (
                        <div key={comment.id} className="d-flex gap-2 mb-2">
                          <img
                            src={getProfilePictureUrl(comment.author_pfp)}
                            className="rounded-circle"
                            alt="User"
                            style={{
                              width: "32px",
                              height: "32px",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.currentTarget.src = Default_pfp; // fallback to default
                            }}
                          />
                          <div className="flex-grow-1">
                            <div className="bg-light rounded p-2">
                              <div className="fw-bold small">
                                {comment.author}
                              </div>
                              <div>{comment.text}</div>
                            </div>
                            <small className="text-muted">
                              {getTimeAgo(comment.timestamp)}
                            </small>
                          </div>
                        </div>
                      ))}

                      {/* show more/less button for comments */}
                      {articleComments.length > 2 && (
                        <div className="text-center mb-2">
                          <button
                            className="btn btn-link btn-sm p-0 text-decoration-none"
                            onClick={() => toggleExpandedComments(article.id)}
                          >
                            {isExpanded
                              ? `Show less comments`
                              : `Show ${
                                  articleComments.length - 2
                                } more comment${
                                  articleComments.length - 2 !== 1 ? "s" : ""
                                }`}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* empty state for comments */}
                {comments[article.id]?.length === 0 && (
                  <p className="text-muted text-center py-3">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArticleList;
