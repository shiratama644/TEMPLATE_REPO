import { expect, test } from "@playwright/test"

test.describe("Visual Regression @visual", () => {
  test("homepage visual", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui; margin: 0; padding: 2rem; background: #fff; }
          .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem; border-radius: 12px; text-align: center; }
          .card { border: 1px solid #e1e4e8; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>Template Repo</h1>
          <p>AI Agent template</p>
        </div>
        <div class="card">
          <h2>Welcome</h2>
          <p>This is a visual regression test</p>
        </div>
      </body>
      </html>
    `)

    // Hide dynamic content
    await page.evaluate(() => {
      // Disable animations
      const style = document.createElement("style")
      style.textContent = `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`
      document.head.appendChild(style)
    })

    await expect(page).toHaveScreenshot("homepage.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: "disabled",
    })
  })

  test("card component visual @visual", async ({ page }) => {
    await page.setContent(`
      <html>
      <head>
        <style>
          body { font-family: system-ui; padding: 2rem; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; max-width: 400px; }
          .card h3 { margin-top: 0; }
          .badge { display: inline-block; padding: 0.25rem 0.5rem; background: #f1f8ff; color: #0366d6; border-radius: 12px; font-size: 0.8rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Feature Card</h3>
          <p>Some content here</p>
          <span class="badge">New</span>
          <span class="badge">Beta</span>
        </div>
      </body>
      </html>
    `)

    const card = page.locator(".card")
    await expect(card).toHaveScreenshot("card.png", {
      maxDiffPixels: 50,
      threshold: 0.2,
    })
  })

  test("responsive visual - mobile @visual", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.setContent(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; margin: 0; padding: 1rem; }
          .container { max-width: 100%; }
          @media (max-width: 768px) { .container { padding: 0.5rem; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Mobile View</h1>
          <p>Responsive content</p>
        </div>
      </body>
      </html>
    `)

    await expect(page).toHaveScreenshot("mobile.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
    })
  })

  test("responsive visual - desktop @visual", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.setContent(`
      <html>
      <head>
        <style>
          body { font-family: system-ui; margin: 0; padding: 2rem; }
          .container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
          .card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">Card 1</div>
          <div class="card">Card 2</div>
        </div>
      </body>
      </html>
    `)

    await expect(page).toHaveScreenshot("desktop.png", {
      maxDiffPixels: 100,
      threshold: 0.2,
    })
  })
})
