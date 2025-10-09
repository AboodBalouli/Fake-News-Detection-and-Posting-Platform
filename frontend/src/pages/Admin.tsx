import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UserFeedback {
  id: number;
  post_id: number;
  post_title: string;
  post_content: string;
  post_author: string;
  user_id: number;
  username: string;
  name: string;
  email: string;
  pfp_filename: string;
  ml_prediction: string;
  ml_confidence: string;
  reported_as: string;
  comment: string | null;
  created_at: string;
  status: string;
}

interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface AdminPost {
  id: number;
  title: string;
  timestamp: string; // formatted date string for display
  author: string; // author name
  prediction?: string;
  confidence?: number;
  approved: boolean;
}

// (Removed unused PostsProps interface)

const Admin = () => {
  const navigate = useNavigate();
  const [pendingReports, setPendingReports] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const currentUserData: { id?: number } = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      console.error("Failed to parse stored user data", err);
      return {};
    }
  })();
  const currentUserId = currentUserData?.id ?? null;
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [retrainMessage, setRetrainMessage] = useState<string | null>(null);
  const [retrainMetrics, setRetrainMetrics] = useState<{
    logistic_regression_accuracy?: number;
  } | null>(null);

  useEffect(() => {
    fetchPendingReports();
    fetchAdminUsers();
    fetchAdminPosts();
  }, []);

  const fetchPendingReports = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login as admin");
        setLoading(false);
        return;
      }

      const response = await fetch("http://localhost:8000/api/admin/feedback", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingReports(data);
      } else if (response.status === 403) {
        setError("Access denied. Admin privileges required.");
      } else {
        setError("Failed to fetch pending reports");
      }
    } catch (err) {
      setError("Network error occurred");
      console.log(
        "this is an error---------------------------------------",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setUsersError("Please login as admin");
        setUsersLoading(false);
        return;
      }

      const response = await fetch("http://localhost:8000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 403) {
        setUsersError("Access denied. Admin privileges required.");
      } else {
        const errorData = await response.json().catch(() => null);
        setUsersError(errorData?.detail || "Failed to fetch users");
      }
    } catch (err) {
      setUsersError("Network error occurred while fetching users");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAdminPosts = async () => {
    try {
      setPostsLoading(true);
      setPostsError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setPostsError("Please login as admin");
        setPostsLoading(false);
        return;
      }

      // Use the admin posts endpoint which returns an array of AdminPostSummary
      const response = await fetch("http://localhost:8000/api/admin/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend fields to the shape used by this UI
        const mapped: AdminPost[] = (Array.isArray(data) ? data : []).map(
          (p: any) => ({
            id: p.id,
            title: p.title,
            author: p.author_name,
            timestamp: new Date(p.created_at).toLocaleString(),
            prediction: p.prediction,
            confidence:
              typeof p.confidence === "number" ? p.confidence : undefined,
            approved: Boolean(p.approved),
          })
        );
        setPosts(mapped);
      } else if (response.status === 403) {
        setPostsError("Access denied. Admin privileges required.");
      } else {
        const errorData = await response.json().catch(() => null);
        setPostsError(errorData?.detail || "Failed to fetch posts");
      }
    } catch (err) {
      setPostsError("Network error occurred while fetching posts");
    } finally {
      setPostsLoading(false);
    }
  };

  const handleApprove = async (
    feedbackId: number,
    action: "approved" | "rejected"
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("token is not valid");
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/admin/feedback/${feedbackId}/approve?action=${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setPendingReports((prev) =>
          prev.filter((report) => report.id !== feedbackId)
        );

        const successMessage =
          action === "approved"
            ? "Report approved and added to training data!"
            : "Report rejected and removed from the review queue.";

        alert(successMessage);
      } else {
        let errorMessage = "Failed to moderate report";
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          }
        } catch (_) {
          /* no-op if response has no JSON body */
        }

        alert(errorMessage);
      }
    } catch (err) {
      alert(
        action === "approved"
          ? "Error occurred while approving report"
          : "Error occurred while rejecting report"
      );
    }
  };

  const handleRetrainModels = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token is not valid");
      return;
    }

    try {
      setRetrainLoading(true);
      setRetrainMessage(null);
      setRetrainMetrics(null);

      const response = await fetch("http://localhost:8000/api/admin/retrain", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRetrainMessage(data.message || "Models retrained successfully.");
        setRetrainMetrics(data.metrics ?? null);
      } else {
        let errorMessage = "Failed to retrain models";
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          }
        } catch (_) {
          /* ignore parse errors */
        }
        setRetrainMessage(errorMessage);
      }
    } catch (err) {
      setRetrainMessage("Network error occurred during retraining.");
    } finally {
      setRetrainLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (userId === currentUserId) {
      alert("You can't delete your own admin account while logged in.");
      return;
    }

    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token is not valid");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.detail || "Failed to delete user");
      }
    } catch (err) {
      alert("Network error occurred while deleting user");
    }
  };

  const handleDeletePost = async (postId: number, title: string) => {
    if (!window.confirm(`Delete post "${title}"? This cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token is not valid");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.detail || "Failed to delete post");
      }
    } catch (err) {
      alert("Network error occurred while deleting post");
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">
            <i className="bi bi-shield-check me-2"></i>
            Admin Dashboard
          </h1>

          <div className="card">
            <div className="card-header d-flex flex-column flex-md-row gap-2 gap-md-0 justify-content-between align-items-md-center">
              <h5 className="mb-0">
                <i className="bi bi-flag me-2"></i>
                Pending User Reports ({pendingReports.length})
              </h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchPendingReports}
                  disabled={retrainLoading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={handleRetrainModels}
                  disabled={retrainLoading}
                >
                  {retrainLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Retraining...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cpu me-1"></i>
                      Retrain Models
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="card-body">
              {retrainMessage && (
                <div
                  className={`alert ${
                    retrainMetrics ? "alert-success" : "alert-warning"
                  } d-flex flex-column gap-1`}
                  role="alert"
                >
                  <strong>{retrainMessage}</strong>
                  {retrainMetrics && (
                    <ul className="mb-0 small">
                      {typeof retrainMetrics.logistic_regression_accuracy ===
                        "number" && (
                        <li>
                          Logistic Regression accuracy:{" "}
                          {(
                            retrainMetrics.logistic_regression_accuracy * 100
                          ).toFixed(2)}
                          %
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
              {pendingReports.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No pending reports</h5>
                  <p className="text-muted">
                    All user reports have been reviewed!
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Post</th>
                        <th>Reporter</th>
                        <th>AI Predicted</th>
                        <th>User Says</th>
                        <th>Comment</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReports.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <div
                              className="fw-bold text-truncate"
                              style={{ maxWidth: "200px" }}
                            >
                              {report.post_title}
                            </div>
                            <small
                              className="text-muted text-truncate d-block"
                              style={{ maxWidth: "200px" }}
                            >
                              {report.post_content}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {report.username}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                report.ml_prediction === "fake"
                                  ? "bg-danger"
                                  : "bg-success"
                              }`}
                            >
                              {report.ml_prediction?.toUpperCase() || "N/A"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                report.reported_as === "fake"
                                  ? "bg-danger"
                                  : "bg-success"
                              }`}
                            >
                              {report.reported_as.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {report.comment ? (
                              <span
                                className="text-truncate d-block"
                                style={{ maxWidth: "150px" }}
                              >
                                {report.comment}
                              </span>
                            ) : (
                              <span className="text-muted">No comment</span>
                            )}
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(report.created_at).toLocaleDateString()}
                            </small>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() =>
                                  navigate(`/admin/feedback/${report.id}`)
                                }
                                title="View full report details"
                              >
                                <i className="bi bi-eye me-1"></i>
                                View
                              </button>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() =>
                                  handleApprove(report.id, "approved")
                                }
                                title="Approve and add to training data"
                              >
                                <i className="bi bi-check-circle me-1"></i>
                                Approve
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() =>
                                  handleApprove(report.id, "rejected")
                                }
                                title="Reject and archive the report"
                              >
                                <i className="bi bi-x-circle me-1"></i>
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4 g-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Manage Users ({users.length})
              </h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchAdminUsers}
                  disabled={usersLoading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
              </div>
            </div>
            <div className="card-body">
              {usersLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading users...</span>
                  </div>
                  <p className="mt-2">Loading users...</p>
                </div>
              ) : usersError ? (
                <div className="alert alert-danger" role="alert">
                  {usersError}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-person-x display-6"></i>
                  <p className="mt-3 mb-0">No users found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="fw-semibold">
                              {user.name || user.username}
                            </div>
                            <div className="text-muted small">
                              @{user.username}
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <span
                              className={`badge ${
                                user.role === "admin"
                                  ? "bg-primary"
                                  : "bg-secondary"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                handleDeleteUser(user.id, user.username)
                              }
                              disabled={user.id === currentUserId}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Manage Posts ({posts.length})
              </h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchAdminPosts}
                  disabled={postsLoading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
              </div>
            </div>
            <div className="card-body">
              {postsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading posts...</span>
                  </div>
                  <p className="mt-2">Loading posts...</p>
                </div>
              ) : postsError ? (
                <div className="alert alert-danger" role="alert">
                  {postsError}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-journal-x display-6"></i>
                  <p className="mt-3 mb-0">No posts found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id}>
                          <td>
                            <div
                              className="fw-semibold text-truncate"
                              style={{ maxWidth: "180px" }}
                            >
                              {post.title}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold">
                              {post.author || "Unknown"}
                            </div>
                            {/* <div className="text-muted small">
                              {post.author_email}
                            </div> */}
                          </td>
                          <td>
                            <div className="small text-muted">
                              {post.timestamp}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                post.approved
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {post.approved ? "Approved" : "Pending"}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                handleDeletePost(post.id, post.title)
                              }
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
