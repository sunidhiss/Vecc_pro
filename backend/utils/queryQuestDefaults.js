/**
 * Six progressive default daily SQL missions for Query Quest.
 * Used to auto-provision today's challenges (Asia/Kolkata) if the admin
 * has not yet configured custom missions for that date.
 */
const DEFAULT_QUERY_QUEST_MISSIONS = [
    {
        mission_order: 1,
        title: 'MISSION 01 — THE CS HONOR ROLL',
        difficulty: 'ROOKIE',
        topic: 'SELECT • WHERE • ORDER BY • LIMIT',
        scenario: 'You are a data analyst at Pixel University. The Dean needs the top performers in Computer Science for the semester merit board.',
        description: "Retrieve the name, usn, and marks of the top 5 students from the 'Computer Science' department, ordered by marks descending.",
        starter_query: 'SELECT name, usn, marks\nFROM students\nWHERE department = \'\';',
        schema_definition: {
            tables: [
                {
                    name: 'students',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'usn', type: 'VARCHAR(20)' },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'department', type: 'VARCHAR(80)' },
                        { name: 'semester', type: 'INTEGER' },
                        { name: 'marks', type: 'INTEGER' },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                students: [
                    { id: 1, usn: 'NNM24CS001', name: 'Aarav Sharma', department: 'Computer Science', semester: 5, marks: 96 },
                    { id: 2, usn: 'NNM24CS004', name: 'Diya Nair', department: 'Computer Science', semester: 5, marks: 93 },
                    { id: 3, usn: 'NNM24CS009', name: 'Rohan Hegde', department: 'Computer Science', semester: 5, marks: 91 },
                    { id: 4, usn: 'NNM24CS012', name: 'Meera Rao', department: 'Computer Science', semester: 5, marks: 88 },
                    { id: 5, usn: 'NNM24CS018', name: 'Kabir Shetty', department: 'Computer Science', semester: 5, marks: 84 },
                    { id: 6, usn: 'NNM24CS025', name: 'Ananya Bhat', department: 'Computer Science', semester: 3, marks: 79 },
                    { id: 7, usn: 'NNM24AD002', name: 'Vikram Kamath', department: 'AI & Data Science', semester: 5, marks: 97 },
                    { id: 8, usn: 'NNM24AD007', name: 'Sneha Pai', department: 'AI & Data Science', semester: 5, marks: 89 },
                    { id: 9, usn: 'NNM24IS003', name: 'Arjun Kini', department: 'Information Science', semester: 5, marks: 92 },
                    { id: 10, usn: 'NNM24EC005', name: 'Pooja Alva', department: 'Electronics & Communication', semester: 5, marks: 86 },
                ],
            },
        },
        expected_result: {
            columns: ['name', 'usn', 'marks'],
            orderMatters: true,
            rows: [
                { name: 'Aarav Sharma', usn: 'NNM24CS001', marks: 96 },
                { name: 'Diya Nair', usn: 'NNM24CS004', marks: 93 },
                { name: 'Rohan Hegde', usn: 'NNM24CS009', marks: 91 },
                { name: 'Meera Rao', usn: 'NNM24CS012', marks: 88 },
                { name: 'Kabir Shetty', usn: 'NNM24CS018', marks: 84 },
            ],
            optimalRules: {
                disallowSelectStar: true,
                requireLimit: true,
                disallowSubquery: true,
                disallowDistinct: true,
            },
        },
        hints: [
            'Filter the students table using a WHERE clause matching the department column.',
            'Sort the filtered rows from highest to lowest marks with ORDER BY marks DESC.',
            'Use LIMIT 5 at the end of your SELECT query to return only the top five rows.',
        ],
        explanation: {
            concept: 'WHERE + ORDER BY + LIMIT',
            summary: 'PostgreSQL evaluates FROM and WHERE first to filter rows, then sorts them with ORDER BY, and finally slices the top rows using LIMIT.',
            syntax: "SELECT name, usn, marks\nFROM students\nWHERE department = 'Computer Science'\nORDER BY marks DESC\nLIMIT 5;",
            commonMistakes: [
                'Forgetting DESC in ORDER BY (default sort is ascending).',
                'Using SELECT * instead of projecting only the requested 3 columns.',
            ],
            alternativeQuery: "SELECT name, usn, marks\nFROM students\nWHERE department = 'Computer Science'\nORDER BY marks DESC\nFETCH FIRST 5 ROWS ONLY;",
        },
    },
    {
        mission_order: 2,
        title: 'MISSION 02 — HIGH-VALUE INVENTORY',
        difficulty: 'ROOKIE',
        topic: 'DISTINCT • BETWEEN • AND',
        scenario: 'The Pixel Campus Store is launching a mid-range tech sale and needs to know which product categories currently have in-stock items priced between 500 and 2500.',
        description: 'Return the distinct category names of products with price between 500 and 2500 (inclusive) and stock greater than 0, sorted alphabetically.',
        starter_query: 'SELECT DISTINCT category\nFROM products\nWHERE price >= 0;',
        schema_definition: {
            tables: [
                {
                    name: 'products',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'category', type: 'VARCHAR(60)' },
                        { name: 'price', type: 'INTEGER' },
                        { name: 'stock', type: 'INTEGER' },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                products: [
                    { id: 1, name: 'Mechanical Keyboard', category: 'Peripherals', price: 2400, stock: 12 },
                    { id: 2, name: 'Gaming Mouse', category: 'Peripherals', price: 1200, stock: 0 },
                    { id: 3, name: 'USB-C Hub', category: 'Accessories', price: 850, stock: 25 },
                    { id: 4, name: 'Laptop Stand', category: 'Accessories', price: 1500, stock: 8 },
                    { id: 5, name: '4K Monitor', category: 'Displays', price: 24000, stock: 5 },
                    { id: 6, name: 'HDMI Cable', category: 'Cables', price: 350, stock: 40 },
                    { id: 7, name: 'Webcam HD', category: 'Video', price: 2500, stock: 6 },
                    { id: 8, name: 'SSD 512GB', category: 'Storage', price: 3200, stock: 10 },
                    { id: 9, name: 'Flash Drive 128GB', category: 'Storage', price: 500, stock: 15 },
                    { id: 10, name: 'Desk Mat', category: 'Accessories', price: 600, stock: 20 },
                ],
            },
        },
        expected_result: {
            columns: ['category'],
            orderMatters: true,
            rows: [
                { category: 'Accessories' },
                { category: 'Peripherals' },
                { category: 'Storage' },
                { category: 'Video' },
            ],
            optimalRules: {
                disallowSelectStar: true,
                disallowSubquery: true,
            },
        },
        hints: [
            'Use SELECT DISTINCT category so duplicate category names appear only once.',
            'Combine your price range filter (BETWEEN 500 AND 2500) with stock > 0 using AND.',
            'Add ORDER BY category ASC at the end to sort alphabetically.',
        ],
        explanation: {
            concept: 'DISTINCT & Range Filtering',
            summary: 'DISTINCT deduplicates identical output rows after WHERE filtering, while BETWEEN is inclusive of both boundary values.',
            syntax: 'SELECT DISTINCT category\nFROM products\nWHERE price BETWEEN 500 AND 2500\n  AND stock > 0\nORDER BY category ASC;',
            commonMistakes: [
                'Using > 500 AND < 2500, which misses boundary items at 500 and 2500.',
                'Forgetting stock > 0, which includes out-of-stock products.',
            ],
            alternativeQuery: 'SELECT category\nFROM products\nWHERE price >= 500 AND price <= 2500 AND stock > 0\nGROUP BY category\nORDER BY category;',
        },
    },
    {
        mission_order: 3,
        title: 'MISSION 03 — CROWDED DEPARTMENTS',
        difficulty: 'EXPLORER',
        topic: 'INNER JOIN • GROUP BY • HAVING',
        scenario: 'The academic board wants to evaluate performance in larger departments while ignoring small elective cohorts.',
        description: 'For departments with at least 3 enrolled students, retrieve department name (as department), average score rounded to 2 decimals (as avg_score), and total enrolled students (as student_count), ordered by avg_score descending.',
        starter_query: 'SELECT d.name AS department\nFROM departments d\nJOIN enrollments e ON d.code = e.dept_code;',
        schema_definition: {
            tables: [
                {
                    name: 'departments',
                    columns: [
                        { name: 'code', type: 'VARCHAR(10)', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'building', type: 'VARCHAR(40)' },
                    ],
                },
                {
                    name: 'enrollments',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'student_usn', type: 'VARCHAR(20)' },
                        { name: 'dept_code', type: 'VARCHAR(10)', foreignKey: { table: 'departments', column: 'code' } },
                        { name: 'score', type: 'INTEGER' },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                departments: [
                    { code: 'CS', name: 'Computer Science', building: 'Block A' },
                    { code: 'AD', name: 'AI & Data Science', building: 'Block B' },
                    { code: 'IS', name: 'Information Science', building: 'Block A' },
                    { code: 'EC', name: 'Electronics', building: 'Block C' },
                ],
                enrollments: [
                    { id: 1, student_usn: 'NNM24CS001', dept_code: 'CS', score: 90 },
                    { id: 2, student_usn: 'NNM24CS002', dept_code: 'CS', score: 85 },
                    { id: 3, student_usn: 'NNM24CS003', dept_code: 'CS', score: 80 },
                    { id: 4, student_usn: 'NNM24CS004', dept_code: 'CS', score: 95 },
                    { id: 5, student_usn: 'NNM24AD001', dept_code: 'AD', score: 92 },
                    { id: 6, student_usn: 'NNM24AD002', dept_code: 'AD', score: 88 },
                    { id: 7, student_usn: 'NNM24AD003', dept_code: 'AD', score: 90 },
                    { id: 8, student_usn: 'NNM24IS001', dept_code: 'IS', score: 84 },
                    { id: 9, student_usn: 'NNM24IS002', dept_code: 'IS', score: 78 },
                    { id: 10, student_usn: 'NNM24EC001', dept_code: 'EC', score: 81 },
                ],
            },
        },
        expected_result: {
            columns: ['department', 'avg_score', 'student_count'],
            orderMatters: true,
            rows: [
                { department: 'AI & Data Science', avg_score: 90, student_count: 3 },
                { department: 'Computer Science', avg_score: 87.5, student_count: 4 },
            ],
            optimalRules: {
                disallowSelectStar: true,
                requireJoin: true,
                disallowSubquery: true,
            },
        },
        hints: [
            'Join departments and enrollments on d.code = e.dept_code.',
            'Group by d.code, d.name and compute ROUND(AVG(e.score), 2) and COUNT(*).',
            'Filter aggregated groups using HAVING COUNT(*) >= 3 (not WHERE).',
        ],
        explanation: {
            concept: 'JOIN + GROUP BY + HAVING',
            summary: 'WHERE filters individual rows before grouping, whereas HAVING filters groups after aggregate functions like COUNT and AVG have been computed.',
            syntax: 'SELECT d.name AS department,\n       ROUND(AVG(e.score), 2) AS avg_score,\n       COUNT(*) AS student_count\nFROM departments d\nINNER JOIN enrollments e ON d.code = e.dept_code\nGROUP BY d.code, d.name\nHAVING COUNT(*) >= 3\nORDER BY avg_score DESC;',
            commonMistakes: [
                'Putting COUNT(*) >= 3 inside WHERE instead of HAVING.',
                'Grouping only by d.name without considering primary key d.code.',
            ],
            alternativeQuery: 'SELECT d.name AS department,\n       ROUND(AVG(e.score)::numeric, 2) AS avg_score,\n       COUNT(e.id) AS student_count\nFROM departments d\nJOIN enrollments e ON d.code = e.dept_code\nGROUP BY d.name\nHAVING COUNT(e.id) >= 3\nORDER BY avg_score DESC;',
        },
    },
    {
        mission_order: 4,
        title: 'MISSION 04 — UNASSIGNED ENGINEERS',
        difficulty: 'EXPLORER',
        topic: 'LEFT JOIN • IS NULL',
        scenario: 'Resource managers at Pixel Labs need to find all engineers currently on the bench with no active project assignment.',
        description: 'Find the id, name, and role of all employees who have not been assigned to any project, ordered by id ascending.',
        starter_query: 'SELECT e.id, e.name, e.role\nFROM employees e\nLEFT JOIN project_assignments pa ON e.id = pa.employee_id;',
        schema_definition: {
            tables: [
                {
                    name: 'employees',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'role', type: 'VARCHAR(60)' },
                        { name: 'salary', type: 'INTEGER' },
                    ],
                },
                {
                    name: 'project_assignments',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'employee_id', type: 'INTEGER', foreignKey: { table: 'employees', column: 'id' } },
                        { name: 'project_name', type: 'VARCHAR(100)' },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                employees: [
                    { id: 1, name: 'Nikhil Verma', role: 'Backend Dev', salary: 85000 },
                    { id: 2, name: 'Kavya Menon', role: 'Frontend Dev', salary: 78000 },
                    { id: 3, name: 'Siddharth Rao', role: 'Data Engineer', salary: 92000 },
                    { id: 4, name: 'Tanya Kulkarni', role: 'QA Engineer', salary: 65000 },
                    { id: 5, name: 'Manav Joshi', role: 'DevOps', salary: 88000 },
                    { id: 6, name: 'Riya Fernandes', role: 'UI Designer', salary: 72000 },
                ],
                project_assignments: [
                    { id: 1, employee_id: 1, project_name: 'Project Atlas' },
                    { id: 2, employee_id: 3, project_name: 'Project Pulse' },
                    { id: 3, employee_id: 5, project_name: 'Project Atlas' },
                ],
            },
        },
        expected_result: {
            columns: ['id', 'name', 'role'],
            orderMatters: true,
            rows: [
                { id: 2, name: 'Kavya Menon', role: 'Frontend Dev' },
                { id: 4, name: 'Tanya Kulkarni', role: 'QA Engineer' },
                { id: 6, name: 'Riya Fernandes', role: 'UI Designer' },
            ],
            optimalRules: {
                disallowSelectStar: true,
                disallowNotIn: true,
            },
        },
        hints: [
            'Use a LEFT JOIN from employees to project_assignments so unassigned employees are preserved.',
            'Unmatched rows from a LEFT JOIN have NULL values in the right-hand table columns.',
            'Filter with WHERE pa.employee_id IS NULL (never = NULL) and order by e.id ASC.',
        ],
        explanation: {
            concept: 'Anti-Join via LEFT JOIN + IS NULL',
            summary: 'A LEFT JOIN keeps every row from the left table; checking IS NULL on the joined column isolates rows with no matching child record.',
            syntax: 'SELECT e.id, e.name, e.role\nFROM employees e\nLEFT JOIN project_assignments pa ON e.id = pa.employee_id\nWHERE pa.employee_id IS NULL\nORDER BY e.id ASC;',
            commonMistakes: [
                'Using INNER JOIN, which drops unassigned employees completely.',
                'Writing = NULL instead of IS NULL, or using NOT IN on nullable columns.',
            ],
            alternativeQuery: 'SELECT e.id, e.name, e.role\nFROM employees e\nWHERE NOT EXISTS (\n  SELECT 1 FROM project_assignments pa WHERE pa.employee_id = e.id\n)\nORDER BY e.id ASC;',
        },
    },
    {
        mission_order: 5,
        title: 'MISSION 05 — THE RUNNER-UP SALARY',
        difficulty: 'MASTER',
        topic: 'CTE • DENSE_RANK • SUBQUERY',
        scenario: 'HR is auditing compensation tiers and wants to identify everyone earning the second-highest distinct salary across the organization.',
        description: 'Retrieve the name, department, and salary of all employees who earn the second-highest distinct salary, ordered by name ascending.',
        starter_query: 'WITH ranked AS (\n  SELECT name, department, salary\n  FROM employees\n)\nSELECT name, department, salary\nFROM ranked;',
        schema_definition: {
            tables: [
                {
                    name: 'employees',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'department', type: 'VARCHAR(60)' },
                        { name: 'salary', type: 'INTEGER' },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                employees: [
                    { id: 1, name: 'Asha Shenoy', department: 'Engineering', salary: 120000 },
                    { id: 2, name: 'Bharat Hegde', department: 'Engineering', salary: 120000 },
                    { id: 3, name: 'Chirag Nayak', department: 'Product', salary: 95000 },
                    { id: 4, name: 'Deepa Alva', department: 'Engineering', salary: 95000 },
                    { id: 5, name: 'Eshan Kini', department: 'Design', salary: 80000 },
                    { id: 6, name: 'Farah Khan', department: 'Product', salary: 75000 },
                ],
            },
        },
        expected_result: {
            columns: ['name', 'department', 'salary'],
            orderMatters: true,
            rows: [
                { name: 'Chirag Nayak', department: 'Product', salary: 95000 },
                { name: 'Deepa Alva', department: 'Engineering', salary: 95000 },
            ],
            optimalRules: {
                disallowSelectStar: true,
            },
        },
        hints: [
            'Two employees are tied at the top salary (120000), so ORDER BY salary DESC LIMIT 1 OFFSET 1 would return the wrong salary!',
            'Use DENSE_RANK() OVER (ORDER BY salary DESC) inside a CTE, or find MAX(salary) < (SELECT MAX(salary) FROM employees).',
            'Filter for rank = 2 and order the final rows by name ASC.',
        ],
        explanation: {
            concept: 'Window Functions (DENSE_RANK) & Tied Top-N',
            summary: 'DENSE_RANK() assigns consecutive ranks without gaps when ties occur, letting you reliably retrieve all rows at rank 2.',
            syntax: 'WITH salary_ranks AS (\n  SELECT name, department, salary,\n         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk\n  FROM employees\n)\nSELECT name, department, salary\nFROM salary_ranks\nWHERE rnk = 2\nORDER BY name ASC;',
            commonMistakes: [
                'Using LIMIT 1 OFFSET 1, which breaks when multiple employees share the highest salary.',
                'Using ROW_NUMBER() instead of DENSE_RANK(), which misses tied second-place earners.',
            ],
            alternativeQuery: 'SELECT name, department, salary\nFROM employees\nWHERE salary = (\n  SELECT MAX(salary)\n  FROM employees\n  WHERE salary < (SELECT MAX(salary) FROM employees)\n)\nORDER BY name ASC;',
        },
    },
    {
        mission_order: 6,
        title: 'MISSION 06 — ALL-CATEGORY SHOPPERS',
        difficulty: 'MASTER',
        topic: 'RELATIONAL DIVISION • HAVING • SUBQUERY',
        scenario: 'The loyalty team wants to reward power shoppers who have explored every single product category in the catalog.',
        description: 'Find the id and name of customers who have ordered at least one product from EVERY distinct category in the products table, ordered by id ascending.',
        starter_query: 'SELECT c.id, c.name\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nJOIN products p ON o.product_id = p.id;',
        schema_definition: {
            tables: [
                {
                    name: 'customers',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'city', type: 'VARCHAR(60)' },
                    ],
                },
                {
                    name: 'products',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'name', type: 'VARCHAR(100)' },
                        { name: 'category', type: 'VARCHAR(60)' },
                    ],
                },
                {
                    name: 'orders',
                    columns: [
                        { name: 'id', type: 'INTEGER', primaryKey: true },
                        { name: 'customer_id', type: 'INTEGER', foreignKey: { table: 'customers', column: 'id' } },
                        { name: 'product_id', type: 'INTEGER', foreignKey: { table: 'products', column: 'id' } },
                    ],
                },
            ],
        },
        seed_data: {
            tables: {
                customers: [
                    { id: 1, name: 'Aditi Pai', city: 'Mangaluru' },
                    { id: 2, name: 'Karan Shetty', city: 'Udupi' },
                    { id: 3, name: 'Neha Bhat', city: 'Bengaluru' },
                    { id: 4, name: 'Omkar Rao', city: 'Mysuru' },
                ],
                products: [
                    { id: 1, name: 'Wireless Earbuds', category: 'Electronics' },
                    { id: 2, name: 'SQL Mastery', category: 'Books' },
                    { id: 3, name: 'Yoga Mat', category: 'Fitness' },
                    { id: 4, name: 'Smart Watch', category: 'Electronics' },
                    { id: 5, name: 'Clean Code', category: 'Books' },
                ],
                orders: [
                    { id: 1, customer_id: 1, product_id: 1 },
                    { id: 2, customer_id: 1, product_id: 2 },
                    { id: 3, customer_id: 1, product_id: 3 },
                    { id: 4, customer_id: 2, product_id: 1 },
                    { id: 5, customer_id: 2, product_id: 4 },
                    { id: 6, customer_id: 2, product_id: 5 },
                    { id: 7, customer_id: 3, product_id: 3 },
                    { id: 8, customer_id: 3, product_id: 4 },
                    { id: 9, customer_id: 3, product_id: 5 },
                    { id: 10, customer_id: 4, product_id: 2 },
                ],
            },
        },
        expected_result: {
            columns: ['id', 'name'],
            orderMatters: true,
            rows: [
                { id: 1, name: 'Aditi Pai' },
                { id: 3, name: 'Neha Bhat' },
            ],
            optimalRules: {
                disallowSelectStar: true,
                requireJoin: true,
            },
        },
        hints: [
            'Join customers, orders, and products so each order row links a customer to a product category.',
            'Group by c.id, c.name and count COUNT(DISTINCT p.category) for each customer.',
            'Compare that distinct category count in HAVING against (SELECT COUNT(DISTINCT category) FROM products).',
        ],
        explanation: {
            concept: 'Relational Division via COUNT(DISTINCT)',
            summary: 'To find entities matching every member of a set, group by entity and verify its COUNT(DISTINCT attribute) equals the total distinct count in the reference table.',
            syntax: 'SELECT c.id, c.name\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nJOIN products p ON o.product_id = p.id\nGROUP BY c.id, c.name\nHAVING COUNT(DISTINCT p.category) = (\n  SELECT COUNT(DISTINCT category) FROM products\n)\nORDER BY c.id ASC;',
            commonMistakes: [
                'Using COUNT(p.category) without DISTINCT — buying two Electronics items and one Book would incorrectly look like 3 categories.',
                'Hardcoding = 3 instead of computing total categories dynamically.',
            ],
            alternativeQuery: 'SELECT c.id, c.name\nFROM customers c\nWHERE NOT EXISTS (\n  SELECT DISTINCT p.category\n  FROM products p\n  WHERE NOT EXISTS (\n    SELECT 1\n    FROM orders o\n    JOIN products p2 ON o.product_id = p2.id\n    WHERE o.customer_id = c.id AND p2.category = p.category\n  )\n)\nORDER BY c.id ASC;',
        },
    },
];

module.exports = DEFAULT_QUERY_QUEST_MISSIONS;
