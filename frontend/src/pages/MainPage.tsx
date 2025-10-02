import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import ArticleList from "../components/ArticleList";

const MainPage = () => {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/articles");
        const data = await response.json();
        const articles = data.articles;
        setArticles(articles);
      } catch (error) {
        console.error("Failed to fetch articles: ", error);
        // fallback to localstorage if api is down
        const savedArticles = JSON.parse(
          localStorage.getItem("articles") || "[]"
        );
        setArticles(savedArticles);
      }
    };

    fetchArticles();
  }, []);

  const refreshArticles = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/articles");
      const data = await response.json();
      setArticles(data.articles);
    } catch (error) {
      // fallback to localstorage
      console.error("failed");
      const savedArticles = JSON.parse(
        localStorage.getItem("articles") || "[]"
      );
      setArticles(savedArticles);
    }
  };

  useEffect(() => {
    const handleFocus = () => refreshArticles();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const filteredArticles = articles.filter(
    (article: any) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Navbar section */}
      <Navbar />
      {/* Main content */}
      <main className="container mt-4">
        {/* Article Counter Section
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">📰 Your FactChecker Dashboard</h5>
                <small className="text-muted">
                  You have posted <strong>{articles.length}</strong> article
                  {articles.length !== 1 ? "s" : ""}
                </small>
              </div> */}

              {/* <div>
                <span className="badge bg-primary fs-6">{articles.length}</span>
              </div>
            </div>
          </div>
        </div> */}

        {/* Search Section */}
        <div className="mb-4">
          <input
            type="text"
            className="form-control w-75 mx-auto"
            placeholder="🔍 Search your articles by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Articles List */}
        <ArticleList articles={filteredArticles} />
      </main>
    </div>
  );
};
export default MainPage;
