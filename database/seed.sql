-- Seed data for Online Examination System
-- Includes realistic exams: Computer Networks, DBMS, OOP in Java/C++, Operating Systems, Artificial Intelligence
-- Realistic student accounts, past attempts, answers, and results

-- Users (Password for all accounts is: password123 | hash: $2a$10$wKz0b9q0MhE83x/z7.lZRe9e8sHwZ230zH0K1mQ1hJbA7CgQx0Mte or standard test hash)
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
(1, 'Dr. Sarah Mitchell', 'teacher@nexusexam.edu', '$2a$10$fIeWpPZ15kP4y0b0jZ8hO.aO3bYVb3GZ0E7U0S2y3sK8q1rO2sBje', 'TEACHER'),
(2, 'Alex Turner', 'alex.turner@student.edu', '$2a$10$fIeWpPZ15kP4y0b0jZ8hO.aO3bYVb3GZ0E7U0S2y3sK8q1rO2sBje', 'STUDENT'),
(3, 'Maya Patel', 'maya.patel@student.edu', '$2a$10$fIeWpPZ15kP4y0b0jZ8hO.aO3bYVb3GZ0E7U0S2y3sK8q1rO2sBje', 'STUDENT'),
(4, 'Liam Davis', 'liam.davis@student.edu', '$2a$10$fIeWpPZ15kP4y0b0jZ8hO.aO3bYVb3GZ0E7U0S2y3sK8q1rO2sBje', 'STUDENT');

-- Students
INSERT INTO student (student_id, user_id, name, email, roll_no) VALUES
(1, 2, 'Alex Turner', 'alex.turner@student.edu', 'CS2026-041'),
(2, 3, 'Maya Patel', 'maya.patel@student.edu', 'CS2026-088'),
(3, 4, 'Liam Davis', 'liam.davis@student.edu', 'CS2026-102');

-- Exams
INSERT INTO exam (exam_id, title, description, duration_minutes, total_marks, passing_percentage, is_published, created_by) VALUES
(1, 'Computer Networks & TCP/IP Architecture', 'Comprehensive assessment on network topologies, OSI/TCP-IP models, IP addressing, routing protocols, and congestion control.', 20, 20, 40, TRUE, 1),
(2, 'Database Management Systems & SQL', 'Relational algebra, normal forms (1NF-BCNF), ACID transactions, B+ Tree indexing, and SQL concurrency protocols.', 25, 25, 40, TRUE, 1),
(3, 'Object-Oriented Programming & Design Patterns', 'Core OOP pillars (Encapsulation, Polymorphism, Inheritance, Abstraction), SOLID principles, and Gang of Four structural patterns.', 15, 15, 40, TRUE, 1),
(4, 'Operating Systems: Kernel & Concurrency', 'Process scheduling, virtual memory paging, deadlock detection algorithms, mutexes, semaphores, and file systems.', 20, 20, 40, TRUE, 1),
(5, 'Artificial Intelligence & Machine Learning', 'Search algorithms (A*, Minimax), neural network feedforward backpropagation, loss functions, reinforcement learning basics.', 30, 30, 40, TRUE, 1);
