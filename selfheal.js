const { exec } = require('child_process'); 
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKeys = [
    'AIzaSyDgeZ-JVfUuVouEoDv_FxlPfCuxz6LeVyw',
    'AIzaSyDuMVRujmPygn0g1QxI-a8CUEZ9gu-Q778',
    'AIzaSyCprWxBmsoxPDcA0OTsYGOOtYVd_51J5po',
    'AIzaSyD-yA6Mg6tLYaRLFwmfis2g41-ONx-lSzc'
];

let currentKeyIndex = 0;
let chatSession; // Variable to hold the current AI chat session

const getNextApiKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return apiKeys[currentKeyIndex];
};

async function askQuestion(question) {
    if (chatSession) {
        chatSession.close(); // Close the old session if it exists
    }

    const apiKey = getNextApiKey();
    console.log(`Using API key: ${apiKey}`);
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        chatSession = model.startChat(); // Start a new chat session
        console.log('Asking AI:', question);
        const result = await chatSession.sendMessage(question);

        if (typeof result.response.text === 'function') {
            return await result.response.text();
        } else {
            throw new Error('Unexpected response format.');
        }
    } catch (error) {
        console.error(`Error with API key ${apiKey}:`, error.message);
    }
}

async function getAIHelp(scriptPath, errorMessage, currentCode) {
    const question = `The following JavaScript code has an error:

Here is the current code:
\`\`\`javascript
${currentCode}
\`\`\`

The error message is: "${errorMessage}". 

Please analyze the code and suggest modifications to fix the error while providing a brief explanation of actions taken. Format your output as:
\`\`\`actions
[LIST OF ACTIONS]
\`\`\`
\`\`\`modified
[YOUR MODIFIED CODE HERE]
\`\`\``;

    return await askQuestion(question);
}

async function fixIssues(scriptPath, errorMessage) {
    const currentCode = fs.readFileSync(scriptPath, 'utf8');
    const aiResponse = await getAIHelp(scriptPath, errorMessage, currentCode);
    
    const actionsMatch = aiResponse.match(/```actions\n([\s\S]*?)\n```/);
    const modifiedCodeMatch = aiResponse.match(/```modified\n([\s\S]*?)\n```/);

    if (actionsMatch && modifiedCodeMatch) {
        const actions = actionsMatch[1].trim().split('\n').map(action => action.trim()).filter(Boolean);
        const modifiedCode = modifiedCodeMatch[1].trim();

        // Log the suggested actions
        console.log('Suggested Actions:');
        actions.forEach(action => console.log(`- ${action}`));

        // Apply modifications to the relevant file(s)
        const modifiedFilePath = path.join(__dirname, 'ukm', 'yt.js'); // Path to the file to be modified
        fs.writeFileSync(modifiedFilePath, modifiedCode);
        console.log(`File modified: ${modifiedFilePath}`);
        console.log('New code:\n', modifiedCode);
    } else {
        console.error('Could not parse the AI response correctly.');
        console.error('AI response was:', aiResponse);
    }
}


async function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve(stdout);
            }
        });
    });
}

async function selfHealing(scriptPath) {
    let attemptCount = 0;
    while (attemptCount < 3) {
        try {
            await runScript(scriptPath);
            console.log(`Project ran successfully: ${scriptPath}`);
            return; // Exit if successful
        } catch ({ stdout, stderr }) {
            console.error('Error running script:', stderr || stdout);
            await fixIssues(scriptPath, stderr || stdout);
            return; // Exit after fixing the issue once
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const newConversation = args.includes('--new');
    
    const scriptPath = path.join(__dirname, 'app.js'); // Specify the script to fix
    await selfHealing(scriptPath);
    console.log('Self-healing process completed.');
    
    if (newConversation) {
        console.log('Starting a new conversation with the AI.');
    }
}

main();
