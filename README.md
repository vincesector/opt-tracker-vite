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
  asset: 'ETH',
  strategyType: 'IRON_CONDOR',
  legs: [...],
  openDate: '2025-05-26'
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
- Join Discord community
- Email support@optiontrackr.com
- Check status.supabase.com

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
