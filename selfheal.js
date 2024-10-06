const { exec } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKeys = [
    'AIzaSyDgeZ-JVfUuVouEoDv_FxlPfCuxz6LeVyw',
    'AIzaSyDuMVRujmPygn0g1QxI-a8CUEZ9gu-Q778',
    'AIzaSyCprWxBmsoxPDcA0OTsYGOOtYVd_51J5po',
    'AIzaSyD-yA6Mg6tLYaRLFwmfis2g41-ONx-lSzc'
];

let currentKeyIndex = 0;

const getNextApiKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return apiKeys[currentKeyIndex];
};

async function askQuestion(question) {
    while (apiKeys.length > 0) {
        const apiKey = getNextApiKey();
        console.log(`Using API key: ${apiKey}`);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const chat = model.startChat();
            console.log('Asking AI:', question);
            const result = await chat.sendMessage(question);

            if (typeof result.response.text === 'function') {
                const responseText = await result.response.text();
                console.log('Received response:', responseText);
                return responseText.trim();
            } else {
                throw new Error('Unexpected response format.');
            }
        } catch (error) {
            console.error(`Error with API key ${apiKey}:`, error.message);
        }
    }
}

function runScript(scriptPath) {
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

async function getAIHelp(errorMessage, scriptPath, currentCode) {
    const question = `I encountered the following error in the script located at ${scriptPath}: ${errorMessage}. 
                     Here is the current code:
                     \`\`\`javascript
                     ${currentCode}
                     \`\`\`
                     Please suggest modifications to fix the error without altering any valid code.
                     The output should be formatted as follows:
                     \`\`\`modified
                     [YOUR MODIFIED CODE HERE]
                     \`\`\`
                     Ensure that only the necessary changes are highlighted.`;

    const aiResponse = await askQuestion(question);
    return aiResponse;
}

async function fixIssues(scriptPath, errorMessage) {
    // Read the current code from the file
    const currentCode = fs.readFileSync(scriptPath, 'utf8');
    
    const aiResponse = await getAIHelp(errorMessage, scriptPath, currentCode);
    
    // Extract the modified code from the AI response
    const modifiedCodeMatch = aiResponse.match(/```modified\n([\s\S]*?)\n```/);
    if (modifiedCodeMatch && modifiedCodeMatch[1]) {
        const modifiedCode = modifiedCodeMatch[1].trim();
        console.log('Applying modifications to the file...');

        // Write the modified code back to the file
        fs.writeFileSync(scriptPath, modifiedCode, (err) => {
            if (err) {
                console.error('Failed to write to file:', err);
            } else {
                console.log('File modified successfully.');
                console.log('New code:\n', modifiedCode);
            }
        });
    } else {
        console.error('Could not parse the modified code from AI response.');
    }
}

async function selfHealing(scriptPath) {
    while (true) {
        try {
            const output = await runScript(scriptPath);
            console.log('Program ran successfully:', output);
            break; 
        } catch ({ error, stdout, stderr }) {
            console.error('Error running script:', stderr || stdout);
            await fixIssues(scriptPath, stderr || stdout);
            console.log('Retrying...');
        }
    }
}

function askForScriptName() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('Please enter the path to the script you want to run: ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    const scriptPath = await askForScriptName();
    
    if (!fs.existsSync(scriptPath)) {
        console.error('The specified script does not exist.');
        return;
    }

    await selfHealing(scriptPath);
}

main();
