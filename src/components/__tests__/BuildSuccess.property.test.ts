import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Feature: production-deployment-readiness
 * Property 1: Build Success
 * 
 * For any valid project state with no syntax errors, running `npm run build`
 * should complete successfully with exit code 0, produce a `dist` directory
 * containing compiled assets, and complete TypeScript compilation without type errors.
 * 
 * Validates: Requirements 1.2, 2.1, 2.2
 */
describe("Property 1: Build Success", () => {
  it("should build successfully with exit code 0", { timeout: 120000 }, () => {
    let exitCode = 0;
    let output = "";
    let errorOutput = "";

    try {
      // Execute build command programmatically
      output = execSync("npm run build", {
        encoding: "utf-8",
        stdio: "pipe",
        cwd: process.cwd(),
        timeout: 60000, // 60 second timeout
      });
    } catch (error: any) {
      exitCode = error.status || 1;
      output = error.stdout || "";
      errorOutput = error.stderr || "";
      
      // Log the error for debugging
      console.error("Build failed with exit code:", exitCode);
      console.error("stdout:", output);
      console.error("stderr:", errorOutput);
    }

    // Verify exit code is 0
    expect(exitCode).toBe(0);

    // Verify no TypeScript errors in output
    const combinedOutput = (output + errorOutput).toLowerCase();
    expect(combinedOutput).not.toContain("error ts");
    expect(combinedOutput).not.toContain("typescript error");
  });

  it("should create dist directory with required files", () => {
    const distPath = join(process.cwd(), "dist");

    // Verify dist directory exists
    expect(existsSync(distPath)).toBe(true);

    // Verify index.html exists
    const indexPath = join(distPath, "index.html");
    expect(existsSync(indexPath)).toBe(true);

    // Verify assets directory exists and contains files
    const assetsPath = join(distPath, "assets");
    expect(existsSync(assetsPath)).toBe(true);

    const assetFiles = readdirSync(assetsPath);
    
    // Verify at least one JS file exists
    const hasJsFile = assetFiles.some((file) => file.endsWith(".js"));
    expect(hasJsFile).toBe(true);

    // Verify at least one CSS file exists
    const hasCssFile = assetFiles.some((file) => file.endsWith(".css"));
    expect(hasCssFile).toBe(true);
  });

  it("should generate source maps for debugging", () => {
    const distPath = join(process.cwd(), "dist");
    const assetsPath = join(distPath, "assets");

    if (existsSync(assetsPath)) {
      const assetFiles = readdirSync(assetsPath);

      // Verify at least one .map file exists
      const hasMapFile = assetFiles.some((file) => file.endsWith(".js.map"));
      expect(hasMapFile).toBe(true);
    }
  });

  it("should produce non-empty bundle files", () => {
    const distPath = join(process.cwd(), "dist");
    const assetsPath = join(distPath, "assets");

    if (existsSync(assetsPath)) {
      const assetFiles = readdirSync(assetsPath);

      // Check that JS files are non-empty
      const jsFiles = assetFiles.filter((file) => file.endsWith(".js"));
      jsFiles.forEach((file) => {
        const filePath = join(assetsPath, file);
        const stats = statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      });

      // Check that CSS files are non-empty
      const cssFiles = assetFiles.filter((file) => file.endsWith(".css"));
      cssFiles.forEach((file) => {
        const filePath = join(assetsPath, file);
        const stats = statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      });
    }
  });
});
