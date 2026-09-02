// Realistic Seed Data for Online Examination System

export interface SeedOption {
  option_text: string;
  is_correct: boolean;
}

export interface SeedQuestion {
  question_text: string;
  marks: number;
  options: SeedOption[];
}

export interface SeedExam {
  title: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  is_published: boolean;
  questions: SeedQuestion[];
}

export const INITIAL_EXAMS: SeedExam[] = [
  {
    title: 'Computer Networks & TCP/IP Architecture',
    description: 'Comprehensive assessment on network topologies, OSI/TCP-IP models, IP addressing, routing protocols, and congestion control.',
    duration_minutes: 20,
    total_marks: 20,
    passing_percentage: 40,
    is_published: true,
    questions: [
      {
        question_text: 'Which protocol operates at the Transport Layer of the OSI model and provides connection-oriented, reliable byte-stream transmission?',
        marks: 2,
        options: [
          { option_text: 'UDP (User Datagram Protocol)', is_correct: false },
          { option_text: 'TCP (Transmission Control Protocol)', is_correct: true },
          { option_text: 'ICMP (Internet Control Message Protocol)', is_correct: false },
          { option_text: 'ARP (Address Resolution Protocol)', is_correct: false }
        ]
      },
      {
        question_text: 'What is the default subnet mask for a standard Class C IPv4 network address?',
        marks: 2,
        options: [
          { option_text: '255.0.0.0', is_correct: false },
          { option_text: '255.255.0.0', is_correct: false },
          { option_text: '255.255.255.0', is_correct: true },
          { option_text: '255.255.255.255', is_correct: false }
        ]
      },
      {
        question_text: 'During the TCP three-way handshake connection establishment, what flags are sent in sequence by client and server?',
        marks: 3,
        options: [
          { option_text: 'SYN -> SYN-ACK -> ACK', is_correct: true },
          { option_text: 'ACK -> SYN -> ACK-SYN', is_correct: false },
          { option_text: 'FIN -> FIN-ACK -> ACK', is_correct: false },
          { option_text: 'RST -> SYN -> ACK', is_correct: false }
        ]
      },
      {
        question_text: 'Which routing protocol uses Dijkstra’s Shortest Path First (SPF) algorithm to construct the routing table?',
        marks: 3,
        options: [
          { option_text: 'RIP (Routing Information Protocol)', is_correct: false },
          { option_text: 'BGP (Border Gateway Protocol)', is_correct: false },
          { option_text: 'OSPF (Open Shortest Path First)', is_correct: true },
          { option_text: 'EGP (Exterior Gateway Protocol)', is_correct: false }
        ]
      },
      {
        question_text: 'Which layer of the OSI model is responsible for data translation, compression, and encryption (such as TLS/SSL)?',
        marks: 2,
        options: [
          { option_text: 'Session Layer', is_correct: false },
          { option_text: 'Presentation Layer', is_correct: true },
          { option_text: 'Application Layer', is_correct: false },
          { option_text: 'Data Link Layer', is_correct: false }
        ]
      },
      {
        question_text: 'What mechanism does CSMA/CD use when a collision is detected on an Ethernet network?',
        marks: 3,
        options: [
          { option_text: 'Token passing to the next host', is_correct: false },
          { option_text: 'Immediate retransmission at maximum power', is_correct: false },
          { option_text: 'Transmission of a Jam signal and Exponential Backoff algorithm', is_correct: true },
          { option_text: 'Switching dynamically to full-duplex token ring', is_correct: false }
        ]
      },
      {
        question_text: 'Which port is used by default for secure HTTPS communication?',
        marks: 2,
        options: [
          { option_text: '80', is_correct: false },
          { option_text: '443', is_correct: true },
          { option_text: '8080', is_correct: false },
          { option_text: '22', is_correct: false }
        ]
      },
      {
        question_text: 'In IPv6 addressing, how many total bits comprise an address?',
        marks: 3,
        options: [
          { option_text: '32 bits', is_correct: false },
          { option_text: '64 bits', is_correct: false },
          { option_text: '128 bits', is_correct: true },
          { option_text: '256 bits', is_correct: false }
        ]
      }
    ]
  },
  {
    title: 'Database Management Systems & SQL',
    description: 'Relational algebra, normal forms (1NF-BCNF), ACID transactions, B+ Tree indexing, and SQL concurrency protocols.',
    duration_minutes: 25,
    total_marks: 25,
    passing_percentage: 40,
    is_published: true,
    questions: [
      {
        question_text: 'Which Normal Form eliminates transitive functional dependencies for non-prime attributes?',
        marks: 3,
        options: [
          { option_text: 'First Normal Form (1NF)', is_correct: false },
          { option_text: 'Second Normal Form (2NF)', is_correct: false },
          { option_text: 'Third Normal Form (3NF)', is_correct: true },
          { option_text: 'Boyce-Codd Normal Form (BCNF)', is_correct: false }
        ]
      },
      {
        question_text: 'What ACID property guarantees that all database modifications within a transaction are completed or none are applied?',
        marks: 3,
        options: [
          { option_text: 'Atomicity', is_correct: true },
          { option_text: 'Consistency', is_correct: false },
          { option_text: 'Isolation', is_correct: false },
          { option_text: 'Durability', is_correct: false }
        ]
      },
      {
        question_text: 'Which SQL clause is used to filter the grouped result sets generated by the GROUP BY clause?',
        marks: 3,
        options: [
          { option_text: 'WHERE', is_correct: false },
          { option_text: 'HAVING', is_correct: true },
          { option_text: 'ORDER BY', is_correct: false },
          { option_text: 'FILTER BY', is_correct: false }
        ]
      },
      {
        question_text: 'Why are B+ Trees preferred over Binary Search Trees for disk-based relational database indexing?',
        marks: 4,
        options: [
          { option_text: 'B+ Trees have a higher branching factor, minimizing disk I/O seek operations', is_correct: true },
          { option_text: 'B+ Trees require zero memory footprint', is_correct: false },
          { option_text: 'Binary Search Trees cannot store string data', is_correct: false },
          { option_text: 'B+ Trees do not require rebalancing on write operations', is_correct: false }
        ]
      },
      {
        question_text: 'In SQL transaction isolation levels, which anomaly occurs when a transaction reads data that has been modified by another uncommitted transaction?',
        marks: 3,
        options: [
          { option_text: 'Non-repeatable Read', is_correct: false },
          { option_text: 'Dirty Read', is_correct: true },
          { option_text: 'Phantom Read', is_correct: false },
          { option_text: 'Lost Update', is_correct: false }
        ]
      },
      {
        question_text: 'Which relational algebra operation corresponds to selecting tuples that satisfy a given predicate condition (symbol: σ)?',
        marks: 3,
        options: [
          { option_text: 'Projection (π)', is_correct: false },
          { option_text: 'Selection (σ)', is_correct: true },
          { option_text: 'Cartesian Product (×)', is_correct: false },
          { option_text: 'Join (⋈)', is_correct: false }
        ]
      },
      {
        question_text: 'What is a Foreign Key in relational database design?',
        marks: 3,
        options: [
          { option_text: 'A field that uniquely identifies every tuple in the same table', is_correct: false },
          { option_text: 'An attribute in one table that references the primary key of another table to maintain referential integrity', is_correct: true },
          { option_text: 'A temporary key created during runtime sorting', is_correct: false },
          { option_text: 'A secondary encryption key stored outside the database', is_correct: false }
        ]
      },
      {
        question_text: 'Which SQL statement is used to revoke privileges granted to a database user?',
        marks: 3,
        options: [
          { option_text: 'DENY', is_correct: false },
          { option_text: 'REVOKE', is_correct: true },
          { option_text: 'REMOVE', is_correct: false },
          { option_text: 'UNGRANT', is_correct: false }
        ]
      }
    ]
  },
  {
    title: 'Object-Oriented Programming & Design Patterns',
    description: 'Core OOP pillars (Encapsulation, Polymorphism, Inheritance, Abstraction), SOLID principles, and Gang of Four structural patterns.',
    duration_minutes: 15,
    total_marks: 15,
    passing_percentage: 40,
    is_published: true,
    questions: [
      {
        question_text: 'Which SOLID principle states that a software module should be open for extension but closed for modification?',
        marks: 2,
        options: [
          { option_text: 'Single Responsibility Principle (SRP)', is_correct: false },
          { option_text: 'Open/Closed Principle (OCP)', is_correct: true },
          { option_text: 'Liskov Substitution Principle (LSP)', is_correct: false },
          { option_text: 'Interface Segregation Principle (ISP)', is_correct: false }
        ]
      },
      {
        question_text: 'Which Design Pattern ensures that a class has only one instance and provides a global point of access to it?',
        marks: 2,
        options: [
          { option_text: 'Factory Method', is_correct: false },
          { option_text: 'Singleton', is_correct: true },
          { option_text: 'Prototype', is_correct: false },
          { option_text: 'Builder', is_correct: false }
        ]
      },
      {
        question_text: 'What OOP mechanism allows a subclass to provide a specific implementation of a method that is already defined by its superclass at runtime?',
        marks: 2,
        options: [
          { option_text: 'Method Overloading (Compile-time)', is_correct: false },
          { option_text: 'Method Overriding (Runtime Dynamic Binding)', is_correct: true },
          { option_text: 'Operator Hiding', is_correct: false },
          { option_text: 'Data Shadowing', is_correct: false }
        ]
      },
      {
        question_text: 'Which Gang of Four pattern attaches additional responsibilities to an object dynamically without altering its structure or modifying the original class?',
        marks: 2,
        options: [
          { option_text: 'Adapter Pattern', is_correct: false },
          { option_text: 'Decorator Pattern', is_correct: true },
          { option_text: 'Composite Pattern', is_correct: false },
          { option_text: 'Proxy Pattern', is_correct: false }
        ]
      },
      {
        question_text: 'What is the primary difference between an Abstract Class and an Interface in modern OOP languages like Java/C#?',
        marks: 2,
        options: [
          { option_text: 'Abstract classes can hold state (instance variables) and constructors, whereas interfaces cannot hold instance state', is_correct: true },
          { option_text: 'Interfaces can be instantiated directly', is_correct: false },
          { option_text: 'Abstract classes cannot contain concrete methods', is_correct: false },
          { option_text: 'A class can extend multiple abstract classes but only implement one interface', is_correct: false }
        ]
      },
      {
        question_text: 'Which principle states that derived classes must be substitutable for their base classes without altering the correctness of the program?',
        marks: 2,
        options: [
          { option_text: 'Liskov Substitution Principle (LSP)', is_correct: true },
          { option_text: 'Dependency Inversion Principle (DIP)', is_correct: false },
          { option_text: 'Interface Segregation Principle (ISP)', is_correct: false },
          { option_text: 'Law of Demeter', is_correct: false }
        ]
      },
      {
        question_text: 'Which behavioral pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified automatically?',
        marks: 3,
        options: [
          { option_text: 'Observer Pattern', is_correct: true },
          { option_text: 'Strategy Pattern', is_correct: false },
          { option_text: 'Command Pattern', is_correct: false },
          { option_text: 'Iterator Pattern', is_correct: false }
        ]
      }
    ]
  },
  {
    title: 'Operating Systems: Kernel & Concurrency',
    description: 'Process scheduling, virtual memory paging, deadlock detection algorithms, mutexes, semaphores, and file systems.',
    duration_minutes: 20,
    total_marks: 20,
    passing_percentage: 40,
    is_published: true,
    questions: [
      {
        question_text: 'Which of the following are the four Coffman conditions required simultaneously for a deadlock to occur in an OS?',
        marks: 3,
        options: [
          { option_text: 'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait', is_correct: true },
          { option_text: 'Paging, Segmentation, Swapping, Thrashing', is_correct: false },
          { option_text: 'Preemption, Starvation, Priority Inversion, Race Condition', is_correct: false },
          { option_text: 'Multithreading, Monolithic Kernel, Direct I/O, IPC', is_correct: false }
        ]
      },
      {
        question_text: 'What deadlock avoidance algorithm tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources?',
        marks: 3,
        options: [
          { option_text: 'Round Robin Algorithm', is_correct: false },
          { option_text: 'Banker’s Algorithm', is_correct: true },
          { option_text: 'Dijkstra’s Shortest Path', is_correct: false },
          { option_text: 'First-Come First-Served', is_correct: false }
        ]
      },
      {
        question_text: 'What happens during "Thrashing" in a virtual memory operating system?',
        marks: 3,
        options: [
          { option_text: 'The CPU spends more time swapping pages into and out of disk than executing user instructions', is_correct: true },
          { option_text: 'All CPU caches are wiped clean during a kernel panic', is_correct: false },
          { option_text: 'Hard drive sectors are physically damaged due to high RPMs', is_correct: false },
          { option_text: 'Network packets are dropped due to high bandwidth congestion', is_correct: false }
        ]
      },
      {
        question_text: 'What hardware component accelerates the translation of virtual memory page addresses to physical frame addresses?',
        marks: 2,
        options: [
          { option_text: 'Translation Lookaside Buffer (TLB)', is_correct: true },
          { option_text: 'Direct Memory Access (DMA) Controller', is_correct: false },
          { option_text: 'Programmable Interrupt Controller (PIC)', is_correct: false },
          { option_text: 'ALU Register File', is_correct: false }
        ]
      },
      {
        question_text: 'Which scheduling algorithm is non-preemptive and selects the process with the smallest execution time burst?',
        marks: 3,
        options: [
          { option_text: 'Shortest Job First (SJF)', is_correct: true },
          { option_text: 'Round Robin (RR)', is_correct: false },
          { option_text: 'Multilevel Feedback Queue', is_correct: false },
          { option_text: 'Shortest Remaining Time First (SRTF)', is_correct: false }
        ]
      },
      {
        question_text: 'What is the primary difference between a Counting Semaphore and a Mutex lock?',
        marks: 3,
        options: [
          { option_text: 'A mutex has ownership and binary state (0/1); a counting semaphore can control access to a finite number of resource instances (N >= 0)', is_correct: true },
          { option_text: 'A mutex can only be used on 64-bit architectures', is_correct: false },
          { option_text: 'Counting semaphores cannot prevent race conditions', is_correct: false },
          { option_text: 'Mutexes run strictly in user mode with no kernel traps', is_correct: false }
        ]
      },
      {
        question_text: 'What system call is used in Unix-like operating systems to create a new child process duplicating the calling process?',
        marks: 3,
        options: [
          { option_text: 'fork()', is_correct: true },
          { option_text: 'exec()', is_correct: false },
          { option_text: 'wait()', is_correct: false },
          { option_text: 'spawn()', is_correct: false }
        ]
      }
    ]
  },
  {
    title: 'Artificial Intelligence & Machine Learning',
    description: 'Search algorithms (A*, Minimax), neural network feedforward backpropagation, loss functions, reinforcement learning basics.',
    duration_minutes: 30,
    total_marks: 30,
    passing_percentage: 40,
    is_published: true,
    questions: [
      {
        question_text: 'In the A* Search Algorithm, what is the evaluation function f(n) composed of?',
        marks: 4,
        options: [
          { option_text: 'f(n) = g(n) + h(n), where g(n) is the exact cost to reach n and h(n) is the estimated heuristic cost to goal', is_correct: true },
          { option_text: 'f(n) = g(n) * h(n), where g(n) is depth and h(n) is branching factor', is_correct: false },
          { option_text: 'f(n) = h(n) - g(n), where h(n) is total distance and g(n) is visited nodes', is_correct: false },
          { option_text: 'f(n) = max(g(n), h(n))', is_correct: false }
        ]
      },
      {
        question_text: 'Which activation function maps real-valued inputs into the probability range (0, 1) such that the output sum of all classes equals 1?',
        marks: 4,
        options: [
          { option_text: 'Softmax', is_correct: true },
          { option_text: 'ReLU (Rectified Linear Unit)', is_correct: false },
          { option_text: 'Tanh (Hyperbolic Tangent)', is_correct: false },
          { option_text: 'Leaky ReLU', is_correct: false }
        ]
      },
      {
        question_text: 'In adversarial game search, what optimization technique eliminates evaluating branches of a game tree that cannot influence the final Minimax decision?',
        marks: 4,
        options: [
          { option_text: 'Alpha-Beta Pruning', is_correct: true },
          { option_text: 'Beam Search', is_correct: false },
          { option_text: 'Simulated Annealing', is_correct: false },
          { option_text: 'Genetic Cross-over', is_correct: false }
        ]
      },
      {
        question_text: 'What algorithm is used to compute gradients of the loss function with respect to weights across layers in a Multi-Layer Perceptron?',
        marks: 4,
        options: [
          { option_text: 'Backpropagation using the Chain Rule of Calculus', is_correct: true },
          { option_text: 'Forward Hebbian Learning', is_correct: false },
          { option_text: 'K-Means Clustering', is_correct: false },
          { option_text: 'Principal Component Analysis (PCA)', is_correct: false }
        ]
      },
      {
        question_text: 'What machine learning problem occurs when a model performs exceptionally well on training data but poorly on unseen test data?',
        marks: 4,
        options: [
          { option_text: 'Overfitting (High Variance)', is_correct: true },
          { option_text: 'Underfitting (High Bias)', is_correct: false },
          { option_text: 'Zero-shot Generalization', is_correct: false },
          { option_text: 'Data Imbalance', is_correct: false }
        ]
      },
      {
        question_text: 'In Reinforcement Learning, what equation balances immediate reward with discounted future cumulative rewards for state-action pairs?',
        marks: 5,
        options: [
          { option_text: 'Bellman Optimality Equation', is_correct: true },
          { option_text: 'Bayes Theorem', is_correct: false },
          { option_text: 'Shannon Entropy Formula', is_correct: false },
          { option_text: 'Markov Inequality', is_correct: false }
        ]
      },
      {
        question_text: 'Which regularisation technique randomly zeroes out a fraction of neurons during each forward training pass to prevent co-adaptation?',
        marks: 5,
        options: [
          { option_text: 'Dropout', is_correct: true },
          { option_text: 'L1 Lasso Regularization', is_correct: false },
          { option_text: 'Batch Normalization', is_correct: false },
          { option_text: 'Weight Decay (L2)', is_correct: false }
        ]
      }
    ]
  }
];
