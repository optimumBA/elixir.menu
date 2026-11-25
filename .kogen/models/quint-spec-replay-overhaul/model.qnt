module model {
  var mode: str
  var sitemap: bool
  var indexable: bool
  var exports: bool
  var plan: List[str]
  var cursor: int

  action start(path: List[str]): bool = all {
    mode' = "clean",
    sitemap' = false,
    indexable' = false,
    exports' = false,
    plan' = path,
    cursor' = 0,
  }

  action init = start(List("public", "public", "preview", "preview", "public"))
  action previewFirst = start(List("preview"))

  action build(nextMode: str): bool = all {
    mode' = nextMode,
    sitemap' = (nextMode == "public"),
    indexable' = (nextMode == "public"),
    exports' = true,
  }

  action step = if (cursor < plan.length()) all {
    build(plan[cursor]),
    cursor' = cursor + 1,
    plan' = plan,
  } else all {
    mode' = mode,
    sitemap' = sitemap,
    indexable' = indexable,
    exports' = exports,
    cursor' = cursor,
    plan' = plan,
  }

  val consistent = all {
    Set("clean", "public", "preview").contains(mode),
    sitemap == (mode == "public"),
    indexable == (mode == "public"),
    exports == (mode != "clean"),
  }
}
