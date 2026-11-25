Feature: Qualify elixir.menu for quint-mbt-cutover-20261125
  This feature qualifies the independent optimumBA/elixir.menu owner locally, not the integrated assembly/Studio pair or any other enrolled owner. The Kogen change set coordinates source dependencies and exact revision qualification for the one cutover. This evidence grants no native approval, release or deployment.

  Scenario: Replay the required build paths on the existing site tooling
    Given quint-spec-replay-overhaul: the elixir.menu checkout and its installed build and Quint tools
    When quint-spec-replay-overhaul: the maintainer runs the local replay command with a fresh evidence location
    Then quint-spec-replay-overhaul: the replay retains evidence of every required path in order
      | path         | states                                        |
      | init         | clean,public,public,preview,preview,public    |
      | previewFirst | clean,preview                                |
    And quint-spec-replay-overhaul: every observed build agrees with its trace and retains the guide and agent exports
    And quint-spec-replay-overhaul: the evidence identifies the exact local inputs for quint-mbt-cutover-20261125

  Scenario: Reject an omitted path or a wrong build observation
    Given quint-spec-replay-overhaul: the elixir.menu checkout and its installed build and Quint tools
    Then quint-spec-replay-overhaul: the real replay rejects a model that omits the return to public
    And quint-spec-replay-overhaul: the real replay rejects a preview that leaves the homepage indexable
