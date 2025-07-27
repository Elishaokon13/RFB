# Zoracle Project Scratchpad

## Background and Motivation
- **Project**: Zoracle - A comprehensive analytics tool like DexScreener built to track Zora coins
- **Current Task**: Improve Creators Page to use `getProfileBalances` for accurate creator earnings
- **Objective**: Replace the current earnings calculation method with the dedicated `getProfileBalances` API from Zora Coins SDK to get more accurate and comprehensive creator earnings data
- **Application Type**: Advanced crypto analytics platform with real-time data from Zora SDK, focused on Base chain tokens with multiple data views
- **Latest Feature**: DexScreener API integration for real-time price data
- **Branding**: Zoracle - positioning as a professional analytics tool

## Key Challenges and Analysis

### Current Implementation Analysis
- **Current Method**: Creators earnings are calculated by aggregating `coin.creatorEarnings[0].amountUsd` from all coins across 6 different SDK endpoints
- **Data Sources**: `getCoinsMostValuable`, `getCoinsTopGainers`, `getCoinsTopVolume24h`, `getCoinsNew`, `getCoinsLastTraded`, `getCoinsLastTradedUnique`
- **Problem**: This method may not provide accurate or complete earnings data as it relies on individual coin data that might be incomplete or inconsistent
- **Current Location**: `src/hooks/useCreators.ts` (lines 164-173)

### Proposed Solution Analysis
- **New Method**: Use `getProfileBalances` API directly for each creator address
- **Benefits**: 
  - More accurate earnings data directly from profile balances
  - Potentially faster as it's a dedicated endpoint for profile data
  - Cleaner data structure
  - Better consistency across creators
- **Import Status**: `getProfileBalances` is already imported but not used (line 7 in useCreators.ts)

### Technical Challenges
1. **API Rate Limiting**: Need to handle multiple `getProfileBalances` calls efficiently
2. **Performance**: Making individual calls for each creator address vs current batch approach
3. **Error Handling**: Handle failures for individual creator balance requests
4. **Data Structure Changes**: May need to update Creator interface to match getProfileBalances response
5. **Caching Strategy**: Implement proper caching for profile balance data
6. **Loading States**: Manage loading states for individual creator balance fetches

### Integration Approach
1. **Hybrid Strategy**: Continue using existing queries to discover creators, but use `getProfileBalances` for earnings
2. **Batch Processing**: Implement efficient batching of `getProfileBalances` calls
3. **Fallback Strategy**: Keep current method as fallback if `getProfileBalances` fails

## High-level Task Breakdown

1. **Research getProfileBalances API** 
   - Study the API parameters, response structure, and rate limits
   - Understand the data format returned by getProfileBalances
   - Identify any Base chain specific considerations
   - Document any required parameters (address, chain, etc.)

2. **Update useCreators Hook Architecture**
   - Modify the data fetching strategy to use getProfileBalances
   - Implement efficient batching for multiple creator addresses
   - Add proper error handling and fallback mechanisms
   - Update TypeScript interfaces to match new data structure

3. **Implement Profile Balance Integration**
   - Create helper function to call getProfileBalances for creator addresses
   - Implement concurrent API calls with proper rate limiting
   - Handle response data transformation and normalization
   - Add loading states for individual creator balance fetches

4. **Performance Optimization**
   - Implement caching strategy for profile balance data
   - Add batching/debouncing for API calls
   - Optimize concurrent request handling
   - Add retry logic for failed requests

5. **Update Creator Interface & Types**
   - Update Creator interface to accommodate new earnings data structure
   - Ensure backward compatibility with existing UI components
   - Update any related TypeScript types and interfaces
   - Validate data transformation between old and new formats

6. **Testing & Validation**
   - Test the new implementation with various creator addresses
   - Validate earnings accuracy against current implementation
   - Test error handling and fallback scenarios
   - Performance testing with large creator datasets
   - Ensure UI still renders correctly with new data structure

7. **Documentation & Cleanup**
   - Update code comments and documentation
   - Remove unused code from old implementation
   - Add JSDoc comments for new functions
   - Update any related README or documentation

## Project Status Board
- [ ] Research getProfileBalances API parameters and response structure
- [ ] Design new useCreators hook architecture with getProfileBalances integration
- [ ] Implement helper functions for profile balance API calls
- [ ] Update Creator interface and TypeScript types
- [ ] Implement efficient batching and error handling
- [ ] Add caching strategy for profile balance data
- [ ] Test implementation with real creator data
- [ ] Validate earnings accuracy and performance
- [ ] Update documentation and clean up unused code

## Current Status / Progress Tracking
**PLANNING PHASE**: Analyzing current implementation and designing approach for integrating getProfileBalances API for accurate creator earnings.

### Current Implementation Analysis:
1. ✅ **Current Approach Understanding**: 
   - Current method aggregates earnings from `coin.creatorEarnings[0].amountUsd` across 6 different SDK endpoints
   - Uses Map-based aggregation to calculate total earnings per creator address
   - Potential accuracy issues due to incomplete individual coin earnings data

2. ✅ **getProfileBalances Research**: 
   - Function is already imported from `@zoralabs/coins-sdk` but unused
   - Need to understand API parameters, response structure, and Base chain compatibility
   - Documentation suggests it provides accurate profile earnings directly

### Planning Considerations:
- **Performance**: Balance between accuracy and performance (individual API calls vs batch aggregation)
- **Error Resilience**: Implement robust error handling and fallback mechanisms
- **Data Consistency**: Ensure new implementation maintains UI compatibility
- **Caching Strategy**: Implement efficient caching to avoid unnecessary API calls

## Executor's Feedback or Assistance Requests
**AWAITING EXECUTION APPROVAL**: Plan is complete and ready for implementation. Key areas requiring attention:

### Implementation Strategy Questions:
1. **API Parameters**: Need to research exact parameters required for `getProfileBalances` (address, chain, etc.)
2. **Response Structure**: Understand the data structure returned to properly update TypeScript interfaces
3. **Rate Limiting**: Determine if there are rate limits and implement appropriate throttling
4. **Base Chain Support**: Ensure getProfileBalances works correctly with Base chain creator addresses

### Technical Implementation Plan:
1. **Phase 1**: Research and understand getProfileBalances API
2. **Phase 2**: Implement helper functions with proper error handling
3. **Phase 3**: Update useCreators hook to use new earnings method
4. **Phase 4**: Test and validate accuracy improvements
5. **Phase 5**: Optimize performance and add caching

**Ready for execution approval to proceed with implementation.**

## Lessons
1. **API Research First**: Always research API parameters and response structure before implementation
2. **Gradual Integration**: Keep existing implementation as fallback during migration
3. **Performance Considerations**: Balance accuracy improvements with performance impact
4. **Error Handling**: Implement robust error handling for external API dependencies
5. **Type Safety**: Update TypeScript interfaces to match new data structures 