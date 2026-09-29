import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("A11y @a11y", () => {
  test("homepage should not have critical a11y violations", async ({ page }) => {
    // For template repo, we test a simple page
    // In real project, replace with your actual URL
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head><title>Test Page</title></head>
      <body>
        <main>
          <h1>Test Page</h1>
          <button>Click me</button>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Test image" />
          <a href="#">Link</a>
        </main>
      </body>
      </html>
    `)

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()

    // Check for critical violations
    const critical = accessibilityScanResults.violations.filter((v) => v.impact === "critical")
    expect(critical, `Critical a11y violations: ${JSON.stringify(critical, null, 2)}`).toHaveLength(
      0,
    )

    // Warn on serious
    const serious = accessibilityScanResults.violations.filter((v) => v.impact === "serious")
    if (serious.length > 0) {
      console.warn(
        `Serious a11y violations found: ${serious.length}`,
        serious.map((v) => v.id),
      )
    }
  })

  test("should have proper heading structure @a11y", async ({ page }) => {
    await page.setContent(`
      <html lang="en">
        <body>
          <h1>Main Title</h1>
          <h2>Section</h2>
          <h3>Subsection</h3>
        </body>
      </html>
    `)

    const results = await new AxeBuilder({ page }).withTags(["wcag2a"]).analyze()
    const headingOrder = results.violations.find((v) => v.id === "heading-order")
    expect(headingOrder).toBeUndefined()
  })

  test("images should have alt text @a11y", async ({ page }) => {
    await page.setContent(`
      <html lang="en">
        <body>
          <img src="test.jpg" alt="Description" />
          <img src="decorative.jpg" alt="" />
        </body>
      </html>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    const imageAlt = results.violations.find((v) => v.id === "image-alt")
    expect(imageAlt).toBeUndefined()
  })

  test("buttons should have accessible names @a11y", async ({ page }) => {
    await page.setContent(`
      <html lang="en">
        <body>
          <button>Submit</button>
          <button aria-label="Close">X</button>
        </body>
      </html>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    const buttonName = results.violations.find((v) => v.id === "button-name")
    expect(buttonName).toBeUndefined()
  })
})
