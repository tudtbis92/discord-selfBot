// Utility functions for the bot
import fs from "node:fs";
import path from "node:path";

/**
 * Generate a random integer between min and max (inclusive)
 */
export const ranInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Recursively get all files with a specific suffix in a directory
 */
export const getFiles = (dir: string, suffix: string): string[] => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let results: string[] = [];
    
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(getFiles(filePath, suffix));
        } else if (file.name.endsWith(suffix)) {
            results.push(filePath);
        }
    }
    
    return results;
};

/**
 * Copy a directory recursively
 */
export const copyDirectory = (src: string, dest: string): void => {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src, { withFileTypes: true });
    
    for (const file of files) {
        const srcPath = path.join(src, file.name);
        const destPath = path.join(dest, file.name);
        
        if (file.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

