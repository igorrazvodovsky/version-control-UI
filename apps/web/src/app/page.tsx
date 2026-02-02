import styles from "./page.module.css";
import { DEFAULT_API_BASE_URL, fetchArticles } from "@/lib/articles";

export default async function Home() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  try {
    const { articles, articlesCount } = await fetchArticles({
      baseUrl,
      requestInit: { cache: "no-store" },
    });

    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>RealWorld</p>
              <h1>Articles</h1>
            </div>
            <p className={styles.subhead}>
              {articlesCount} article{articlesCount === 1 ? "" : "s"} available.
            </p>
          </header>

          {articlesCount === 0 ? (
            <div className={styles.empty}>
              <p>No articles yet. Create one to see it appear here.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {articles.map((article) => (
                <li key={article.slug} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2>{article.title}</h2>
                    <span className={styles.slug}>/{article.slug}</span>
                  </div>
                  <p className={styles.description}>{article.description}</p>
                  <div className={styles.meta}>
                    <span>By {article.author.username}</span>
                    <span>
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {article.tagList.length > 0 && (
                    <div className={styles.tags}>
                      {article.tagList.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to load articles.";

    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>RealWorld</p>
              <h1>Articles</h1>
            </div>
            <p className={styles.subhead}>Unable to load articles.</p>
          </header>

          <div className={styles.error}>
            <p>{message}</p>
            <p className={styles.hint}>
              Make sure the backend is running at {baseUrl}.
            </p>
          </div>
        </main>
      </div>
    );
  }
}
