# Controle A Dois

Controle A Dois is a collaborative financial management platform designed for people who plan and manage money together. It brings personal and shared finances into a single workspace, giving participants a clear view of their financial activity and helping them make decisions from the same information.

## How it works

Each user has a personal financial workspace and can create or join shared workspaces through invitation codes. Workspace owners can manage members, permissions, names, and budget limits, while participants can move between their available spaces without mixing their records.

Transactions are organized as income, expenses, and investments. They can include categories, due dates, payment status, notes, and payment information. The platform also supports receipt-based transaction entry and spreadsheet imports, reducing the effort required to keep records current.

The dashboard turns transaction data into an overview of balances, cash flow, pending bills, spending against the workspace budget, and recent activity. A calendar presents financial commitments by date, while payment views help users track what is still due. Reports provide visual analysis of income, expenses, accumulated balance, spending patterns, category distribution, and the largest expenses within a selected period.

Authentication and email verification protect user access. Financial data is stored in Firebase and server-side operations use authenticated sessions to connect each action to the current user and workspace.

The project is built around a simple idea: when finances are shared, the information used to manage them should be shared too.

## Runtime

Production requires Node.js 22 because Firebase Admin 14 does not support older Node.js runtimes. The version is pinned in `package.json` so server routes use the correct runtime on Vercel.
