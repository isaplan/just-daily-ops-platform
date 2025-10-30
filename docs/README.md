# Documentation Index

Welcome to the Just Daily Ops Platform documentation. This documentation is organized by domain and is automatically updated by scripts to stay current with the codebase.

## 📚 Domain Documentation

### [Finance](./finance/README.md)
Complete documentation for the Finance domain, including:
- Database tables and structure
- Pages and components
- API endpoints
- Data flow diagrams
- PowerBI import process

### [Labor](./labor/README.md)
*(Coming soon)* Labor domain documentation

### [Sales](./sales/README.md)
*(Coming soon)* Sales domain documentation

## 🤖 Auto-Updates

This documentation is automatically updated via scripts:
- `scripts/docs/update-finance-docs.js` - Updates finance documentation

Run these scripts when:
- Adding new tables/APIs
- Creating new pages/components
- Changing data flows

## 📖 How to Use

1. **For Development**: Check domain-specific docs before implementing features
2. **For Understanding**: Read data-flow.md to understand how data moves through the system
3. **For Reference**: Use database.md to find table structures and relationships
4. **For Integration**: Check api-endpoints.md to see available APIs

## 🔄 Keeping Docs Updated

Documentation is updated automatically, but you can manually trigger updates:
```bash
npm run docs:update
```

