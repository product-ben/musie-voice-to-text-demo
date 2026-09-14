const PAGES = [
  { href: "#/", label: "Demo" },
  { href: "#/lab", label: "Segmentation lab" },
];

export function Nav({ route }: { route: string }) {
  return (
    <nav className="nav">
      {PAGES.map((page) => {
        const target = page.href.replace(/^#/, "");
        const isActive = route === target;
        return (
          <a key={page.href} href={page.href} className={isActive ? "nav-link is-active" : "nav-link"}>
            {page.label}
          </a>
        );
      })}
    </nav>
  );
}
