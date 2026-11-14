import { Records, addMonths, demos, orderLine, today } from './domain';

export function seed(): Records {
  const date = today();
  const data: Records = {
    accounts: [
      ...demos.map((person) => ({
        ...person,
        email: `${person.username}@codemart.example`,
        track: 'Web' as const,
        card: person.role === 'student' ? '4242' : '',
        avatar: '',
      })),
      {
        id: 'data-demo',
        username: 'malak',
        name: 'Malak Farid',
        role: 'student',
        email: 'malak@codemart.example',
        track: 'Data',
        card: '4242',
        avatar: '',
      },
      {
        id: 'cyber-demo',
        username: 'ali',
        name: 'Ali Tarek',
        role: 'student',
        email: 'ali@codemart.example',
        track: 'Cyber',
        card: '4242',
        avatar: '',
      },
    ],
    instructors: [
      { id: 'dina', name: 'Dina Sami', track: 'Web', salary: 5500, royalty: 12 },
      { id: 'karim', name: 'Karim Hany', track: 'Data', salary: 5200, royalty: 10 },
      { id: 'mariam', name: 'Mariam Ali', track: 'Cyber', salary: 5400, royalty: 15 },
    ],
    products: [
      {
        id: 'angular',
        name: 'Angular in Practice',
        description: 'Build a working Angular app with standalone components, signals and routing.',
        track: 'Web',
        kind: 'Course',
        price: 1250,
        instructorId: 'dina',
        active: true,
      },
      {
        id: 'sql',
        name: 'SQL Field Notes',
        description: 'Work through practical queries, joins and window functions with sample data.',
        track: 'Data',
        kind: 'Course',
        price: 950,
        instructorId: 'karim',
        active: true,
      },
      {
        id: 'defender',
        name: 'Defender’s Lab Kit',
        description:
          'A starter pack for asset inventories, detection notes and incident timelines.',
        track: 'Cyber',
        kind: 'Template',
        price: 450,
        instructorId: '',
        active: true,
      },
      {
        id: 'starter',
        name: 'Interface Starter Kit',
        description: 'Start your next project with layout, component and accessibility checklists.',
        track: 'Web',
        kind: 'Template',
        price: 380,
        instructorId: '',
        active: true,
      },
      {
        id: 'data-voucher',
        name: 'Data Assessment Voucher',
        description: 'A sample voucher for the CodeMart data track practice assessment.',
        track: 'Data',
        kind: 'Voucher',
        price: 700,
        instructorId: '',
        active: true,
      },
      {
        id: 'identity',
        name: 'Identity & Access',
        description: 'Learn how to design permissions, role boundaries and access reviews.',
        track: 'Cyber',
        kind: 'Course',
        price: 1100,
        instructorId: 'mariam',
        active: true,
      },
    ],
    enrollments: [
      { studentId: 'student-demo', track: 'Web', startedOn: date },
      { studentId: 'data-demo', track: 'Data', startedOn: date },
      { studentId: 'cyber-demo', track: 'Cyber', startedOn: date },
    ],
    invoices: [
      {
        id: 'CM-101',
        studentId: 'student-demo',
        track: 'Web',
        label: 'Full-stack Web · Installment 1 of 3',
        amount: 4000,
        issuedOn: date,
        dueOn: date,
        paidOn: date,
      },
      {
        id: 'CM-102',
        studentId: 'student-demo',
        track: 'Web',
        label: 'Full-stack Web · Installment 2 of 3',
        amount: 4000,
        issuedOn: date,
        dueOn: addMonths(date, 1),
        paidOn: null,
      },
      {
        id: 'CM-103',
        studentId: 'student-demo',
        track: 'Web',
        label: 'Full-stack Web · Installment 3 of 3',
        amount: 4000,
        issuedOn: date,
        dueOn: addMonths(date, 2),
        paidOn: null,
      },
      {
        id: 'CM-104',
        studentId: 'data-demo',
        track: 'Data',
        label: 'Applied Data · Installment 1 of 3',
        amount: 3500,
        issuedOn: date,
        dueOn: date,
        paidOn: date,
      },
      {
        id: 'CM-105',
        studentId: 'cyber-demo',
        track: 'Cyber',
        label: 'Cyber Defense · Installment 1 of 3',
        amount: 3800,
        issuedOn: date,
        dueOn: date,
        paidOn: null,
      },
    ],
    orders: [],
    payroll: [],
    budget: [
      {
        id: 'B-101',
        date,
        track: 'Web',
        type: 'Expense',
        label: 'Classroom lab credits',
        amount: 680,
      },
      {
        id: 'B-102',
        date,
        track: 'Data',
        type: 'Income',
        label: 'Workshop partner contribution',
        amount: 1750,
      },
      {
        id: 'B-103',
        date,
        track: 'Cyber',
        type: 'Expense',
        label: 'Training materials',
        amount: 420,
      },
    ],
  };
  for (const [track, studentId, name, price] of [
    ['Data', 'data-demo', 'Applied Data', 3500],
    ['Cyber', 'cyber-demo', 'Cyber Defense', 3800],
  ] as const) {
    for (const number of [2, 3]) {
      data.invoices.push({
        id: `CM-${106 + data.invoices.length - 5}`,
        studentId,
        track,
        label: `${name} · Installment ${number} of 3`,
        amount: price,
        issuedOn: date,
        dueOn: addMonths(date, number - 1),
        paidOn: null,
      });
    }
  }
  data.orders = [
    {
      id: 'ORD-101',
      studentId: 'student-demo',
      date,
      lines: [data.products[3]].map((product) => orderLine(product, data.instructors)),
    },
    {
      id: 'ORD-102',
      studentId: 'data-demo',
      date,
      lines: [data.products[1], data.products[4]].map((product) =>
        orderLine(product, data.instructors),
      ),
    },
    {
      id: 'ORD-103',
      studentId: 'cyber-demo',
      date,
      lines: [data.products[2], data.products[5]].map((product) =>
        orderLine(product, data.instructors),
      ),
    },
  ];
  return data;
}
