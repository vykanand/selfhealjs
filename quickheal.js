const fs = require('fs');
const path = require('path');
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

// Function to rotate API keys if --new flag is used
const rotateApiKeyIfNeeded = () => {
    if (process.argv.includes('--new')) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    }
};

// Function to ask AI for analysis
async function askAI(question) {
    rotateApiKeyIfNeeded(); // Rotate key if --new flag is present
    const apiKey = apiKeys[currentKeyIndex];

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const chat = model.startChat();
        console.log('Asking AI...');
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

// Function to analyze error
async function analyzeError(scriptPath, errorMessage) {
    const code = fs.readFileSync(scriptPath, 'utf8').split('\n');
    const dependencies = await gatherDependencies(scriptPath);

    const formattedCode = code.map((line) => line).join('\n'); // No line numbers here
    const formattedDependencies = dependencies.map(dep => {
        const depLines = dep.content.split('\n').map(line => line).join('\n');
        return `**${dep.path}:**\n\`\`\`javascript\n${depLines}\n\`\`\``;
    }).join('\n\n');

    const question = `
### Code Analysis Request

The following JavaScript code has an error:

#### Code from **${scriptPath}**:
\`\`\`javascript
${formattedCode}
\`\`\`

#### Dependencies:
${formattedDependencies}

#### Error Message:
"${errorMessage}"

---

Please identify the root cause of the error and suggest a fix. Include the file name and line number in your analysis, and provide a corrected code block without line numbers for easy copying.
`;

    return await askAI(question);
}


// Function to gather dependencies
async function gatherDependencies(scriptPath) {
    const code = fs.readFileSync(scriptPath, 'utf8');
    const dependencies = [];
    
    const regex = /(?:require\(['"`])([^'"`]+)(?:['"`]\))|(?:import\s+(?:\w+|\*\s+as\s+\w+|{[^}]+})\s+from\s+['"`]([^'"`]+)['"`])/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
        const depPath = match[1] || match[2];
        const fullPath = path.resolve(path.dirname(scriptPath), depPath + '.js');
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            dependencies.push({ path: fullPath, content });
        }
    }
    
    return dependencies;
}

// Main function
async function main() {
    const scriptPath = path.join(__dirname, 'app.js'); // Change this to your script
    let errorMessage = null;

    try {
        // Attempt to run the script (or any specific logic you want to test)
        require(scriptPath); // This will throw if there's an error in app.js
    } catch (error) {
        errorMessage = error.message; // Capture the error message
        console.error(`Caught an error: ${errorMessage}`);
    }

    // If an error occurred, analyze it
    if (errorMessage) {
        const aiResponse = await analyzeError(scriptPath, errorMessage);
        console.log('\n--- AI Response ---\n');
        console.log(aiResponse);
    } else {
        console.log('Script executed successfully without errors.');
    }
}

main();
