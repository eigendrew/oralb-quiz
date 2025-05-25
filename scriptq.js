let questionsData = [];
let logicData = [];
let currentQuestionIndex = 0;
let answers = [];

async function loadData() {
    const [questionsResponse, logicResponse] = await Promise.all([
        fetch('questions.csv'),
        fetch('logic.csv')
    ]);

    const questionsText = await questionsResponse.text();
    const logicText = await logicResponse.text();

    parseQuestionsCSV(questionsText);
    parseLogicCSV(logicText);

    const prevBtn = document.getElementById('prev-btn');
    prevBtn.onclick = () => {
        if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
        showQuestion();
        }
    };

    showQuestion();

}


// Parse questions.csv
function parseQuestionsCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    const result = {};
    rows.forEach(line => {
        const columns = parseCSVRow(line);
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = columns[idx];
        });

        const qNumber = row['qNumber'];

        if (!result[qNumber]) {
            result[qNumber] = { question: row['question'], options: [] };
        }

        result[qNumber].options.push({
            main: row['optionMain'],
            sub: row['optionSub'],
            logicCode: row['logicCode']
        });
    });

    questionsData = Object.values(result);
}

// Parse logic.csv
function parseLogicCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    logicData = rows.map(line => {
        const columns = parseCSVRow(line);
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = columns[idx];
        });
        return row;
    });
}

// Parse a CSV row properly handling quotes
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));

    return result;
}

// Show the current question
function showQuestion() {
    const questionContainer = document.getElementById('question-container');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-btn');

    const current = questionsData[currentQuestionIndex];

    questionContainer.innerText = current.question;
    optionsContainer.innerHTML = '';

    current.options.forEach((opt) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.innerHTML = `
            <span class="option-main">${opt.main}</span>
            <span class="option-sub">${opt.sub}</span>
        `;
        button.onclick = () => {
            answers[currentQuestionIndex] = opt.logicCode;
            nextQuestion();
        };
        optionsContainer.appendChild(button);
    });

    if (currentQuestionIndex === 0) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline-block';
    }

}

// Go to next question
function nextQuestion() {
    if (currentQuestionIndex < questionsData.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        showRecommendation();
    }
}

function showRecommendation() {
    const recommendedProduct = findRecommendation();

    localStorage.setItem('allAnswers', JSON.stringify(answers));
    localStorage.setItem('recommendation', JSON.stringify(recommendedProduct || null));

    // Show email step first
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('options-container').style.display = 'none';
    document.getElementById('prev-btn').style.display = 'none';
    document.getElementById('email-step').style.display = 'block';

    // Set up email submit + skip
    document.getElementById('submit-email').onclick = () => {
        const email = document.getElementById('email-input').value.trim();
        if (email) {
            localStorage.setItem('userEmail', email);
            // submitQuizToAPI(email, answers).then(() => {
            submitQuizToAPI(email, answers, recommendedProduct).then(() => {
                console.log("📤 Submission completed, now redirecting...");
                window.location.href = 'result.html';
            });            
        } else {
            window.location.href = 'result.html';
        }
    };
    
    
    

    document.getElementById('skip-email').onclick = () => {
        window.location.href = 'result.html';
    };
}


// Find the matching product based on user's answers
function findRecommendation() {
    for (let entry of logicData) {
        if (
            entry.q3 === answers[2] &&
            entry.q4 === answers[3] &&
            entry.q5 === answers[4] &&
            entry.q6 === answers[5]
        ) {
            return entry;
        }
    }
    return null; // No match found
}

// Start everything
loadData();

// 🔹 Submit to Azure Function
const apiUrl = "/api/submitQuiz"; // your Azure Function URL

// function submitQuizToAPI(email, answers) {
//     console.log("📤 Sending to Azure Function:", { email, answers });

//     return fetch(apiUrl, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ email, answers })
//     })
//     .then(res => res.json())
//     .then(data => {
//         console.log("✅ Submitted to API:", data);
//     })
//     .catch(err => {
//         console.error("❌ Error submitting to API:", err);
//     });
// }

function submitQuizToAPI(email, answers, recommendation) {
    const payload = {
        email,
        answers,
        recommendation: {
            name: recommendation.productName,
            imageUrl: recommendation.imageUrl,
            buyUrl: recommendation.buyUrl // ✅ make sure this field name matches what's in logic.csv
        }
    };

    console.log("📤 Sending to Azure Function:", payload);

    return fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        console.log("✅ Submitted to API:", data);
    })
    .catch(err => {
        console.error("❌ Error submitting to API:", err);
    });
}



