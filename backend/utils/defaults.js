const DEFAULTS = {
    wordle: { word: 'FLAME' },
    unscramble: { word: 'REACT' },
    aptitude: {
        questions: [
            { q: 'What is 15% of 200?', options: ['20', '30', '40', '50'], answer: '30' },
            { q: 'If A is faster than B, and B is faster than C. Is A faster than C?', options: ['Yes', 'No', 'Maybe', "Can't say"], answer: 'Yes' },
            { q: 'A train 120m long passes a pole in 6s. Find its speed in m/s.', options: ['10', '15', '20', '25'], answer: '20' },
            { q: 'What is the next number in the series: 2, 6, 12, 20, ... ?', options: ['24', '28', '30', '32'], answer: '30' },
            { q: 'Probability of getting a head when tossing a coin?', options: ['0.25', '0.5', '0.75', '1'], answer: '0.5' },
        ],
    },
    techquiz: {
        questions: [
            { q: 'Which data structure uses LIFO?', options: ['Queue', 'Stack', 'Tree', 'Graph'], answer: 'Stack' },
            { q: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Machine Logic', 'Hyper Tabular Markup Language', 'None'], answer: 'Hyper Text Markup Language' },
            { q: 'What is time complexity of Binary Search?', options: ['O(n)', 'O(n^2)', 'O(log n)', 'O(1)'], answer: 'O(log n)' },
            { q: 'Which is not a relational database?', options: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle'], answer: 'MongoDB' },
            { q: 'What does API stand for?', options: ['Application Programming Interface', 'Advanced Protocol Integrator', 'Automated Process Instant', 'Application Process Interface'], answer: 'Application Programming Interface' },
        ],
    },
    fluencyquiz: {
        questions: [
            { q: 'Choose the correct sentence:', options: ["She don't like apples.", "She doesn't likes apples.", "She doesn't like apples.", "She don't likes apples."], answer: "She doesn't like apples." },
            { q: "What is the synonym of 'Abundant'?", options: ['Scarce', 'Plentiful', 'Rare', 'Empty'], answer: 'Plentiful' },
            { q: 'Identify the adjective: The quick brown fox jumps.', options: ['quick', 'fox', 'jumps', 'The'], answer: 'quick' },
            { q: 'Choose the correct spelling:', options: ['Accommodate', 'Acommodate', 'Accomodate', 'Acomodate'], answer: 'Accommodate' },
            { q: 'He has been working here ___ 2015.', options: ['for', 'since', 'from', 'until'], answer: 'since' },
        ],
    },
    outputquiz: {
        questions: [
            { q: 'What is the output of this JS code?', code: 'console.log(typeof null);', options: ['undefined', 'object', 'null', 'string'], answer: 'object' },
            { q: 'Find the output of the Python snippet:', code: 'print(2 ** 3 ** 2)', options: ['64', '512', '72', 'None'], answer: '512' },
            { q: 'What is the output in JavaScript?', code: "console.log('1' + 1 - 1);", options: ['11', '10', 'NaN', '0'], answer: '10' },
            { q: 'Evaluate this C++ snippet:', code: 'int x = 5;\ncout << x++ + ++x;', options: ['10', '11', '12', 'compiler error'], answer: '12' },
            { q: 'What does this output?', code: 'console.log([] == ![]);', options: ['true', 'false', 'TypeError', 'undefined'], answer: 'true' },
        ],
    },
};

module.exports = DEFAULTS;
