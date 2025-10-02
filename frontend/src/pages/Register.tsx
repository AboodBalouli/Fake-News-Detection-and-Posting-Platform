import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] =
    useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // handle profile picture selection and preview
  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("File size must be less than 5MB");
        return;
      }

      setProfilePicture(file);

      // create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // remove selected profile picture
  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview("");
  };

  const handleSubmit = async (event: React.MouseEvent) => {
    event.preventDefault();
    setIsUploading(true);

    // Check if all required fields are filled
    if (!email || !password || !confirmPassword || !name || !username) {
      alert("Please fill in all required fields");
      setIsUploading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      setIsUploading(false);
      return;
    }

    try {
      let pfpFilename = null;

      // Upload profile picture first if provided
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);

        const uploadResponse = await fetch(
          "http://localhost:8000/api/upload-profile-picture",
          {
            method: "POST",
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          pfpFilename = uploadData.filename;
        } else {
          throw new Error("Failed to upload profile picture");
        }
      }

      // register user
      const response = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          username: username,
          email: email,
          password: password,
          pfp_filename: pfpFilename,
        }),
      });


      if (response.ok) {
        const data = await response.json();
        console.log("Registration successful:", data);
        alert("Registration successful! Please login with your credentials.");
        navigate("/");
      } else {
        const errorData = await response.json();
        console.log("Registration failed:", errorData);
        alert("Registration failed: " + errorData.detail);
      }
    } catch (error) {
      console.log("Network error:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
      <div className="row d-flex justify-content-center align-items-center h-100">
        <div className="col-md-9 col-lg-6 col-xl-5">
          <img
            src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp"
            className="img-fluid"
          />
        </div>
        <div
          className="col-md-8 col-lg-6 col-xl-4 offset-xl-1"
          style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
        >
          <form>
            {/* profile picture upload section */}
            <div className="form-group text-center mb-4">
              <label className="form-label fw-bold">
                Profile Picture (Optional)
              </label>

              {/* profile picture preview */}
              <div className="mb-3">
                {profilePicturePreview ? (
                  <div className="position-relative d-inline-block">
                    <img
                      src={profilePicturePreview}
                      alt="Profile Preview"
                      className="rounded-circle"
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle"
                      style={{ width: "30px", height: "30px" }}
                      onClick={removeProfilePicture}
                      title="Remove picture"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto"
                    style={{
                      width: "120px",
                      height: "120px",
                      border: "2px dashed #ccc",
                    }}
                  >
                    <i className="fas fa-camera fa-2x text-muted"></i>
                  </div>
                )}
              </div>

              {/* file input */}
              <div className="mb-3">
                <input
                  type="file"
                  className="form-control"
                  id="profilePicture"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                />
                <small className="text-muted">
                  Choose an image file (max 5MB)
                </small>
              </div>
            </div>

            {/* name section */}
            <div className="form-group">
              <input
                type="text"
                className="form-control form-control-lg"
                id="registerName"
                placeholder="Full Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p />
            </div>

            {/* username section */}
            <div className="form-group">
              <input
                type="text"
                className="form-control form-control-lg"
                id="registerUsername"
                placeholder="Username *"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p />
            </div>

            {/* email section */}
            <div className="form-group">
              <input
                type="email"
                className="form-control form-control-lg"
                id="exampleInputEmail1"
                aria-describedby="emailHelp"
                placeholder="Email Address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p />
            </div>

            {/* password section */}
            <div className="form-group">
              <input
                type="password"
                className="form-control form-control-lg"
                id="exampleInputPassword1"
                placeholder="Password *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p />
              <input
                type="password"
                className={
                  confirmPassword !== password
                    ? "form-control form-control-lg border border-danger"
                    : "form-control form-control-lg"
                }
                id="confirmPassword"
                placeholder="Confirm Password *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword !== password && confirmPassword && (
                <small className="text-danger">Passwords do not match</small>
              )}
            </div>

            <div className="text-center text-lg-start mt-4 pt-2">
              <button
                type="button"
                data-mdb-button-init
                data-mdb-ripple-init
                className="btn btn-primary btn-lg"
                style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                onClick={handleSubmit}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            <div className="text-center mt-3">
              <small className="text-muted">
                Already have an account?{" "}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => navigate("/")}
                >
                  Login here
                </button>
              </small>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
