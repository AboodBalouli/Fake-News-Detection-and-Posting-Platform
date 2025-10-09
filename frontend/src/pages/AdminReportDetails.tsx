import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
  pfp_filename: string | null;
  ml_prediction: string | null;
  ml_confidence: number | null;
  reported_as: string;
  comment: string | null;
  created_at: string;
  status: string;
}

const AdminReportDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<UserFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login as admin");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:8000/api/admin/feedback",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 403) {
            setError("Access denied. Admin privileges required.");
          } else {
            setError("Failed to fetch report details");
          }
          setLoading(false);
          return;
        }

        const rawData: UserFeedback[] = await response.json();
        const matchedReport = rawData
          .map((item) => ({
            ...item,
            ml_confidence:
              item.ml_confidence !== null && item.ml_confidence !== undefined
                ? Number(item.ml_confidence)
                : null,
          }))
          .find((item) => item.id === Number(id));

        if (!matchedReport) {
          setError("Report not found");
        } else {
          setReport(matchedReport);
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const renderConfidence = (confidence: number | null) => {
    if (confidence === null || Number.isNaN(confidence)) {
      return "N/A";
    }
    return `${Number(confidence).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Unable to load report</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Report Details</h1>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(-1)}
        >
          Back to Admin Dashboard
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Post Information</h5>
        </div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Post ID</dt>
            <dd className="col-sm-9">{report.post_id}</dd>

            <dt className="col-sm-3">Title</dt>
            <dd className="col-sm-9">{report.post_title}</dd>

            <dt className="col-sm-3">Content</dt>
            <dd className="col-sm-9">
              <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {report.post_content}
              </pre>
            </dd>

            <dt className="col-sm-3">Author</dt>
            <dd className="col-sm-9">{report.post_author}</dd>
          </dl>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Reporter Details</h5>
        </div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Reporter ID</dt>
            <dd className="col-sm-9">{report.user_id}</dd>

            <dt className="col-sm-3">Username</dt>
            <dd className="col-sm-9">{report.username}</dd>

            <dt className="col-sm-3">Name</dt>
            <dd className="col-sm-9">{report.name}</dd>

            <dt className="col-sm-3">Email</dt>
            <dd className="col-sm-9">{report.email}</dd>

            <dt className="col-sm-3">Status</dt>
            <dd className="col-sm-9 text-capitalize">{report.status}</dd>

            <dt className="col-sm-3">Reported At</dt>
            <dd className="col-sm-9">{formatDate(report.created_at)}</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">ML Prediction vs User Feedback</h5>
        </div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Model Prediction</dt>
            <dd className="col-sm-9 text-capitalize">
              {report.ml_prediction ?? "N/A"}
            </dd>

            <dt className="col-sm-3">Model Confidence</dt>
            <dd className="col-sm-9">
              {renderConfidence(report.ml_confidence)}
            </dd>

            <dt className="col-sm-3">User Reported As</dt>
            <dd className="col-sm-9 text-capitalize">{report.reported_as}</dd>

            <dt className="col-sm-3">Reporter Comment</dt>
            <dd className="col-sm-9">
              {report.comment ? (
                <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {report.comment}
                </pre>
              ) : (
                <span className="text-muted">No comment left</span>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default AdminReportDetails;
