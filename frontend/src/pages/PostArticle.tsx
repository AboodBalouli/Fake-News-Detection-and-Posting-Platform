// import React from "react";
import { useState } from "react";
import Navbar from "../components/Navbar";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PostAlert from "../components/PostAlert";

const PostArticle = () => {
  const navigate = useNavigate();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (alertVisible) {
      const timer = setTimeout(() => setAlertVisible(false), 3000);
      return () => clearTimeout(timer); // Cleanup
    }
  }, [alertVisible]);

  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const handleImageChange = (e: any) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!articleTitle || !articleContent) {
      setAlertMessage("Please fill all fields.");
      setAlertVisible(true);
      return;
    }

    try {
      let imageFilename = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(
          "http://localhost:8000/api/upload-image",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
          }
        );
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageFilename = uploadResult.filename;
        } else {
          throw new Error("Failed to upload image");
        }
      }

      // create article object for database
      const newArticle = {
        title: articleTitle,
        content: articleContent,
        image_filename: imageFilename, // null if no image
      };

      const response = await fetch("http://localhost:8000/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newArticle),
      });

      if (response.ok) {
        const result = await response.json();
        setAlertMessage("Article posted successfully to database!");
        console.log("Article created with ID:", result.id);
      } else {
        const error = await response.json();
        setAlertMessage(
          `Failed to post article: ${error.detail || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Network error:", error);
      setAlertMessage("Network error. Please check if the backend is running.");
    }

    setAlertVisible(true);

    // Clear form
    setArticleTitle("");
    setArticleContent("");
    setImagePreview("");
    setImageFile(null);

    setTimeout(() => {
      navigate("/main", { replace: true }); // replace: true forces refresh
    }, 1500);
  };

  return (
    <div>
      <Navbar />
      {alertVisible && <PostAlert>{alertMessage}</PostAlert>}
      <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100">
        <div className="col-md-8 col-lg-6">
          <div className="card p-4">
            <h3>Post Article</h3>
            <form>
              <div className="mb-3">
                <label className="form-label">Article Title</label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Enter your article title (max 50 characters)"
                  maxLength={50}
                />
                <small className="form-text text-muted">
                  {articleTitle.length}/50 characters
                </small>
              </div>
              <div className="mb-3">
                <label className="form-label">Article Content</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Enter your article content (max 2000 characters)"
                  maxLength={2000}
                />
                <small className="form-text text-muted">
                  {articleContent.length}/2000 characters
                </small>
              </div>
              <div className="mb-3">
                <label className="form-label">Upload images</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: "200px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                      }}
                    />
                    <p className="small text-muted mt-1">Image preview</p>
                  </div>
                )}
              </div>
              <div className="d-flex justify-content-center">
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                >
                  Submit Article
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostArticle;
