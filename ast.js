const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { GoogleGenerativeAI } = require('@google/generative-ai');

// List of API keys
const apiKeys = [
    'AIzaSyDgeZ-JVfUuVouEoDv_FxlPfCuxz6LeVyw',
    'AIzaSyDuMVRujmPygn0g1QxI-a8CUEZ9gu-Q778',
    'AIzaSyDgeZ-JVfUuVouEoDv_FxlPfCuxz6LeVyw',
    'AIzaSyD-yA6Mg6tLYaRLFwmfis2g41-ONx-lSzc'
];

let currentKeyIndex = 0;

// Function to get the next API key
const getNextApiKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return apiKeys[currentKeyIndex];
};

// Function to ask AI for analysis
async function askAI(question) {
    const apiKey = getNextApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const chat = model.startChat();

    console.log('Asking AI...');
    try {
        const result = await chat.sendMessage(question);
        if (typeof result.response.text === 'function') {
            return await result.response.text();
        } else {
            throw new Error('Unexpected response format.');
        }
    } catch (error) {
        console.error(`Error with API key ${apiKey}:`, error.message);
    }
}

const projectPath = './'; // Change this to your project directory

function analyzeProject(directory) {
    const classes = [];
    const dependencies = [];

    // Recursively read files in the directory
    function readFiles(dir) {
        console.log(`Reading directory: ${dir}`); // Debugging
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!isIgnoredDirectory(fullPath)) { // Ignore specific directories
                    readFiles(fullPath); // Recurse into subdirectories
                } else {
                    console.log(`Ignoring directory: ${fullPath}`); // Debugging
                }
            } else if (file.endsWith('.js') && !isIgnoredFile(fullPath)) {
                console.log(`Analyzing file: ${fullPath}`); // Debugging
                analyzeFile(fullPath, classes, dependencies);
            }
        });
    }

    readFiles(directory);
    return { classes, dependencies };
}

// Function to check if a directory should be ignored
function isIgnoredDirectory(dir) {
    const ignoredDirs = ['node_modules', '.git'];
    return ignoredDirs.some(ignored => dir.includes(`/${ignored}`) || dir.includes(`\\${ignored}`));
}

// Function to check if a file should be ignored
function isIgnoredFile(filePath) {
    return filePath.includes('node_modules') || filePath.includes('.git');
}

function analyzeFile(filePath, classes, dependencies) {
    const code = fs.readFileSync(filePath, 'utf8');
    try {
        const ast = parser.parse(code, { sourceType: 'module' });

        // Log the AST for inspection
        console.log(`AST for ${filePath}:`, JSON.stringify(ast, null, 2)); // Debugging

        traverse(ast, {
            ClassDeclaration(path) {
                const className = path.node.id.name;
                classes.push(className);
                // Find dependencies
                path.traverse({
                    CallExpression(callPath) {
                        if (callPath.node.callee.name) {
                            dependencies.push({
                                className,
                                method: callPath.node.callee.name,
                                file: filePath,
                            });
                        }
                    },
                });
            },
        });
    } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error.message); // Error logging
    }
}

function generatePrompt(classes, dependencies) {
    let prompt = `### Project Analysis for SOLID Principles Refactoring\n\n`;
    prompt += `Classes found:\n- ${classes.join('\n- ')}\n\n`;
    prompt += `Dependencies:\n`;
    dependencies.forEach(dep => {
        prompt += `- Class: ${dep.className} calls method: ${dep.method} in file: ${dep.file}\n`;
    });
    prompt += `\n### Please analyze the above classes and their dependencies against the SOLID principles and provide refactoring suggestions.`;
    return prompt;
}

async function main() {
    const { classes, dependencies } = analyzeProject(projectPath);
    const prompt = generatePrompt(classes, dependencies);
    
    console.log(prompt); // Log the generated prompt
    if (classes.length === 0 && dependencies.length === 0) {
        console.log('No classes or dependencies found.'); // Debugging
    } else {
        const aiResponse = await askAI(prompt); // Ask AI with the generated prompt
        console.log(`\n--- AI Response ---\n`);
        console.log(aiResponse);
    }
}

main();
