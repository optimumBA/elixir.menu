Feature: Sponsors information page
  This feature covers the new /sponsors/ business information page, its agent index entry,
  the unchanged tool exports, its layout at narrow and wide widths, and its discovery.

  Background:
    Given elixir-menu-sponsors-page-20261121: the site has been built once

  Scenario: Sponsors page and agent index copy
    Then elixir-menu-sponsors-page-20261121: the built sponsors page explains how a coding agent uses Elixir Menu to choose tools
    And elixir-menu-sponsors-page-20261121: the built sponsors page and the agent index entry say a sponsor is optional and disclosed and the user keeps the choice
    And elixir-menu-sponsors-page-20261121: the built sponsors page states that no sponsor is active and the formats are not yet available
    And elixir-menu-sponsors-page-20261121: the built sponsors page puts the visitor protections next to the offer
    And elixir-menu-sponsors-page-20261121: the built sponsors page labels any workflow as an example
    And elixir-menu-sponsors-page-20261121: the built sponsors page, its Markdown copies and the agent index entry contain no price, discount, traffic or campaign figure and no Plausible or Cloudflare name or link

  Scenario: Tool exports unchanged
    Then elixir-menu-sponsors-page-20261121: every existing tool export is still published with exactly its committed content
    And elixir-menu-sponsors-page-20261121: no existing tool export mentions a sponsor or the sponsors path

  Scenario: Narrow and wide layout
    Then elixir-menu-sponsors-page-20261121: the built sponsors page uses the shared site layout
    And elixir-menu-sponsors-page-20261121: the built sponsors page content fits the viewport at 360 and 1280 pixels
    And elixir-menu-sponsors-page-20261121: a copy of the sponsors page whose main content has a fixed width of 428 pixels overflows at 360 pixels

  Scenario: Discovery and contact
    Then elixir-menu-sponsors-page-20261121: a normal page links to the sponsors page from its footer
    And elixir-menu-sponsors-page-20261121: the agent index lists the sponsors page under business information
    And elixir-menu-sponsors-page-20261121: the inquiry link points to the existing verified product contact
    And elixir-menu-sponsors-page-20261121: the sponsors page head has a title, a description and the canonical URL of the sponsors route
    And elixir-menu-sponsors-page-20261121: the built sitemap lists the sponsors page once
    And elixir-menu-sponsors-page-20261121: only one built page serves the sponsors route
