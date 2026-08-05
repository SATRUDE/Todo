export default function BlogPost() {
  return (
    <main id="main">
      <section className="container">
        <article className="grid-cur border-theme-border-02 mb-v3 gap-y-0">
          <div className="col-span-full grid grid-cols-subgrid *:col-span-full md:col-start-1 md:col-end-19 lg:col-start-1 lg:col-end-17 xl:col-start-7 xl:col-end-19">
            {/* Shared wrapper div for header and nav - side by side */}
            <div className="header-nav-wrapper">
              <header className="mb-v2">
                <h1 className="type-lg text-balance">A visual editor for the Cursor Browser</h1>
                <div className="type-base text-theme-text-sec mt-v4/12">
                  <time dateTime="2025-12-11T00:00:00.000Z">Dec 11, 2025</time> by <span>Jason Ginsberg & Ryo Lu</span>
                  <span className="xl:hidden">
                    <span> in </span>
                    <a className="text-theme-text-sec hover:text-theme-text active:text-theme-text-sec capitalize" href="/blog/topic/product">product</a>
                  </span>
                </div>
              </header>
              <nav id="contents" className="card card--text mb-v2 type-sm">
                Contents
                <ul>
                  <li>Rearrange with drag-and-drop</li>
                  <li>Test component states directly</li>
                  <li>Adjust properties with visual controls</li>
                  <li>Point and prompt</li>
                  <li>Up the abstraction hierarchy</li>
                </ul>
              </nav>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

