# OptionTrackr

## Overview
A modern web application built with React and Vite for tracking and analyzing options trading strategies. The application features a sleek dark theme UI, real-time strategy calculations, interactive visualizations, and cloud synchronization with offline support.

## Features
- 📈 Real-time strategy payoff calculations and visualization
- 💪 Support for multi-leg option strategies (up to 4 legs)
- 💰 Advanced P&L tracking and ROI calculations
- 📊 Interactive payoff diagrams using Chart.js
- 🔢 Break-even point calculations
- 🌐 Cloud synchronization with Supabase
- 💾 Offline support with local storage
- 📱 Responsive design with dark theme UI
- 📊 Export data to CSV
- 🔒 User authentication and data privacy

## Tech Stack
### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom dark theme
- **Charts**: Chart.js with custom plugins
- **State Management**: React Hooks
- **Form Components**: Custom-built UI components

### Backend & Storage
- **Cloud Platform**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Local Storage**: IndexedDB & localStorage
- **API**: REST with automatic offline sync

### Development Tools
- **Package Manager**: npm
- **Code Quality**: ESLint
- **CSS Processing**: PostCSS with Autoprefixer
- **Type Safety**: JSDoc annotations
- **Code Organization**: Module-based architecture

## Project Structure
```
src/
├── components/          # React components
│   ├── DatePicker.jsx  # Date selection component
│   ├── Input.jsx       # Reusable input component
│   ├── Leg.jsx         # Option leg component
│   ├── Select.jsx      # Dropdown component
│   └── StrategyForm.jsx # Main strategy form
├── services/           # Service layer
│   ├── supabase.js    # Supabase client & auth
│   ├── storageService.js # Data persistence
│   └── databaseService.js # Local database operations
├── styles/            # CSS styles
│   ├── index.css     # Tailwind imports
│   └── styles.css    # Custom styles
└── utils/            # Utility functions
    ├── chartUtils.js # Chart.js configurations
    └── strategyCalculations.js # Options math
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm 7+ installed
- Supabase account (free tier works fine)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd opt-tracker-vite
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start development server
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Architecture

### Data Flow
1. User inputs are processed in React components
2. Calculations performed in utility functions
3. Data saved to local storage for offline support
4. When online, data syncs with Supabase
5. Changes propagate across tabs/devices

### Components

#### StrategyForm
Main component handling:
- Asset selection (ETH, BTC, SOL)
- Strategy type detection (spreads, straddles, etc.)
- Date range selection
- Multiple option legs (up to 4)
- Real-time P&L visualization

#### Option Legs
Configurable options:
- Action (Buy/Sell)
- Type (Call/Put)
- Strike price
- Premium
- Contract quantity
- Position sizing

### Data Management

#### Local Storage
- IndexedDB for offline persistence
- localStorage for sync status
- Cross-tab synchronization
- Automatic conflict resolution

#### Cloud Storage (Supabase)
- PostgreSQL database
- Row Level Security
- User authentication
- Real-time sync
- Data export capabilities

### Strategy Calculations
- Break-even points
- Maximum profit/loss scenarios
- Net premium calculations
- ROI calculations
- Greeks calculations (planned)
- Probability of profit estimation

## Styling Guide
### Theme Colors
- Background: #0D1117
- Card Background: #161B22
- Text: #C9D1D9
- Primary: #00A67E
- Border: #30363D
- Hover: #21262D
- Success: #238636
- Error: #F85149

### Component Library
All components follow these principles:
- Dark theme by default
- Consistent spacing
- Responsive design
- Accessible (ARIA compliant)
- Interactive feedback

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Configuration Files
1. **vite.config.js** - Vite & server configuration
2. **tailwind.config.js** - Theme & styling
3. **postcss.config.js** - CSS processing
4. **eslint.config.js** - Code quality
5. **.env** - Environment variables

### Adding New Features
1. Create components in `src/components`
2. Add services in `src/services`
3. Update calculations in `utils/`
4. Test offline & online scenarios
5. Update documentation

### Database Schema
```sql
strategies
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── asset (text)
├── strategy_type (text)
├── open_date (date)
├── close_date (date)
├── legs (jsonb)
├── margin_required (numeric)
├── asset_price (numeric)
├── max_profit (numeric)
├── max_loss (numeric)
├── trade_outcome (text)
├── pnl (numeric)
├── roi (numeric)
├── timestamp (bigint)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

## API Documentation

### Storage Service API

#### `saveStrategy(strategy)`
- **Description**: Saves or updates an options trading strategy
- **Parameters**: 
  - `strategy` (Object): The strategy object containing all trade details
- **Returns**: Promise resolving to the saved strategy ID
- **Offline Support**: Yes
- **Example**:
```javascript
const strategy = {
  asset: 'EXAMPLE_ASSET',
  strategyType: 'EXAMPLE_STRATEGY',
  legs: [/* strategy legs */],
  openDate: '2024-01-01'
};
await storageService.saveStrategy(strategy);
```

#### `getStrategies()`
- **Description**: Retrieves all strategies for the current user
- **Returns**: Promise resolving to an array of strategy objects
- **Offline Support**: Yes

#### `deleteStrategy(id)`
- **Description**: Deletes a strategy by ID
- **Parameters**:
  - `id` (string): The UUID of the strategy
- **Returns**: Promise resolving when deletion is complete
- **Offline Support**: Yes

### Supabase Integration

#### Authentication
```javascript
// Login with email
await supabase.auth.signIn({ email, password });

// Login with provider
await supabase.auth.signIn({ provider: 'google' });

// Logout
await supabase.auth.signOut();
```

#### Real-time Subscriptions
```javascript
// Subscribe to strategy changes
const subscription = supabase
  .from('strategies')
  .on('*', payload => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

## Troubleshooting

### Common Issues

#### Offline Mode
1. **Data not syncing**
   - Check internet connection
   - Verify that localStorage isn't full
   - Clear browser cache and reload
   - Check browser console for sync errors

2. **Cross-tab sync issues**
   - Ensure localStorage events are enabled
   - Close duplicate tabs
   - Clear site data and reload

#### Authentication
1. **Login failures**
   - Verify email format
   - Check password requirements
   - Clear browser cookies
   - Try incognito mode

2. **Session expired**
   - Re-login required
   - Check token expiration
   - Verify Supabase project status

#### Data Management
1. **Strategy save failures**
   - Check required fields
   - Verify data format
   - Check storage quota
   - Ensure valid date ranges

2. **Chart rendering issues**
   - Clear browser cache
   - Update Chart.js version
   - Check console for JS errors
   - Verify data format

### Error Messages

#### "Failed to sync with cloud"
- **Cause**: Network issues or invalid auth token
- **Solution**: 
  1. Check internet connection
  2. Re-authenticate
  3. Clear local storage
  4. Retry sync

#### "Invalid strategy configuration"
- **Cause**: Missing or invalid strategy parameters
- **Solution**:
  1. Check all required fields
  2. Verify date formats
  3. Ensure valid strike prices
  4. Check option types

### Performance Optimization
1. **Slow loading**
   - Reduce stored strategies
   - Clear old data
   - Use pagination
   - Check network speed

2. **High memory usage**
   - Close unused tabs
   - Clear browser cache
   - Limit strategy history
   - Update browser

### Getting Help
- Check GitHub issues
- Join our community (see community guidelines)
- Contact project maintainers
- Check Supabase status page

## Contributing
1. Fork the repository
2. Create your feature branch
3. Test offline & online functionality
4. Submit pull request with documentation
5. Include test cases

## License
MIT License

## Acknowledgments
- React - Frontend framework
- Vite - Build tooling
- Tailwind CSS - Styling
- Chart.js - Data visualization
- Supabase - Backend & authentication

## Version Control

### Git Setup
1. Initialize Git repository (if not already done):
```bash
git init
```

2. Configure Git user information:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### GitHub Integration

The project is hosted on GitHub. After cloning, update your remote origin:
```bash
git remote set-url origin your-repository-url
```

#### Basic Workflow
1. Clone the repository:
```bash
git clone https://github.com/vincesector/opt-tracker-vite.git
cd opt-tracker-vite
```

2. Create a new branch for your feature:
```bash
git checkout -b feature-name
```

3. Make your changes and commit them:
```bash
git add .
git commit -m "Description of your changes"
```

4. Push changes to GitHub:
```bash
git push origin feature-name
```

5. Create a pull request on GitHub

#### Best Practices
- Make small, focused commits
- Write clear commit messages
- Pull latest changes before starting new work:
```bash
git pull origin main
```
- Create a new branch for each feature/fix
- Review your changes before committing:
```bash
git diff
```

#### Branch Naming Convention
- Features: `feature/description`
- Bugfixes: `fix/description`
- Documentation: `docs/description`
- Performance improvements: `perf/description`

## Security

### Environment Variables
The project uses a `.env` file for environment variables. For security:
1. Never commit `.env` to Git
2. Use `.env.example` as a template
3. Each developer should maintain their own `.env` file locally

### Rotating Supabase Keys
If you need to rotate your Supabase anon key:

1. Go to Supabase Dashboard (https://app.supabase.com)
2. Select your project
3. Go to Project Settings → API
4. Click "Reset anon key" under "Project API keys"
5. Update your local `.env` file with the new key
6. If deployed, update the key in your deployment environment

⚠️ After rotating keys:
- Update all development environments
- Update production environment
- Test authentication flows
- Verify real-time subscriptions

## Database Optimization

### Indexes
The following indexes are implemented for better query performance:

```sql
-- Indexes for improved query performance
idx_strategies_user_id    - Quick access to user's strategies
idx_strategies_asset     - Fast filtering by asset type
idx_strategies_open_date - Efficient date-based queries
idx_strategies_user_date - Optimized user's strategies by date
```

Benefits:
- Faster strategy list loading
- Efficient asset filtering
- Quick date-based sorting
- Improved overall query performance

### Security Best Practices

#### Sensitive Information
Never commit or expose in documentation:
- API keys or tokens
- Database credentials
- Authentication secrets
- Production URLs
- User data or statistics
- Internal configuration details

#### Environment Variables
Use placeholder values in examples:
```env
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### API Examples
Use placeholder values in code examples:
```javascript
const strategy = {
  id: "example-id",
  asset: "EXAMPLE",
  // ...other fields
};
```

#### Database Queries
Avoid exposing actual table structures in examples. Use simplified versions:
```sql
CREATE TABLE strategies (
  id uuid PRIMARY KEY,
  -- other fields
);
```
