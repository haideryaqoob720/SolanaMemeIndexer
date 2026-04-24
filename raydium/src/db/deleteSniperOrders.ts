import prisma from "../prisma/prisma";


/**
 * Deletes all tokens where DEX is Raydium and their related records
 * Processing one mint at a time to avoid timeouts
 */
export async function deleteRaydiumTokens() {
  
  try {
    console.log('Starting deletion of Raydium tokens...');
    
    // Step 1: Get all distinct mints from sniperOrders where DEX is Raydium
    const raydiumOrders = await prisma.sniperOrders.findMany({
      where: {
        dex: 'PumpSwap'
      },
      select: {
        mint: true
      },
      distinct: ['mint']
    });
    
    const mintsToDelete = raydiumOrders.map(order => order.mint);
    
    console.log(`Found ${mintsToDelete.length} tokens to delete`);
    
    // Step 2: Process each mint one at a time
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    for (const mint of mintsToDelete) {
      try {
        console.log(`Processing token ${processed + 1}/${mintsToDelete.length}: ${mint}`);
        
        // Use a transaction for each mint to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Delete related records from all tables in the correct order to respect referential integrity
          
          // 1. Delete from hot_monitoring
          await tx.hot_monitoring.deleteMany({
            where: { mint }
          });
          
          // 2. Delete from pump_tokens
          await tx.pump_tokens.deleteMany({
            where: { mint }
          });
          
          // 3. Delete from rug_score
          await tx.rug_score.deleteMany({
            where: { mint }
          });
          
          // 4. Delete from pumpswapTokens
          await tx.pumpswapTokens.deleteMany({
            where: { mint }
          });
          
          // 5. Delete from tokenPools
          await tx.tokenPools.deleteMany({
            where: { mint }
          });
          
          // 6. Delete from hotTokens
          await tx.hotTokens.deleteMany({
            where: { mint }
          });
          
          // 7. Delete from sniperOrders
          await tx.sniperOrders.deleteMany({
            where: { mint }
          });
          
          // 8. Delete from transactions
          await tx.transactions.deleteMany({
            where: { mint }
          });
          
          // 9. Delete from raydium_tokens
          await tx.raydium_tokens.deleteMany({
            where: { mint }
          });
          
          // 10. Finally, delete the token itself
          await tx.tokens.delete({
            where: { mint }
          });
        });
        
        succeeded++;
        console.log(`Successfully deleted token: ${mint}`);
      } catch (error) {
        failed++;
        console.error(`Error deleting token ${mint}:`, error);
      }
      
      processed++;
      
      // Optional: Add a small delay between tokens to reduce database load
      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${mintsToDelete.length} (${succeeded} succeeded, ${failed} failed)`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('Deletion process completed.');
    console.log(`Total tokens processed: ${processed}`);
    console.log(`Successfully deleted: ${succeeded}`);
    console.log(`Failed: ${failed}`);
    
  } catch (error) {
    console.error('Error in deletion process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function


// import { PrismaClient } from '@prisma/client';

/**
 * Deletes tokens that have no transactions in the last hour
 * Processing one token at a time to avoid timeouts
 */
export async function deleteInactiveTokens() {
//   const prisma = new PrismaClient();
  
  try {
    console.log('Starting identification of inactive tokens...');
    
    // Calculate timestamp for 1 hour ago (in seconds)
    const oneHourAgo = Math.floor(Date.now() / 1000) - (420 * 60);
    
    // Step 1: Find all tokens
    const allTokens = await prisma.tokens.findMany({
        // where:{
        //     total_holders:{
        //         lt:10
        //     }
        // },
      select: {
        mint: true
      }
    });
    
    console.log(`Found ${allTokens.length} total tokens to check for inactivity`);
    
    // Step 2: Check each token for transactions in the last hour
    let processed = 0;
    let deleted = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const token of allTokens) {
      const { mint } = token;
      
      try {
        // Check if the token has any transactions in the last hour
        const recentTransactions = await prisma.transactions.findFirst({
          where: {
            mint,
            timestamp: {
              gte: oneHourAgo
            }
          },
          select: {
            id: true
          }
        });
        
        // If the token has recent transactions, skip it
        if (recentTransactions) {
          skipped++;
          processed++;
          continue;
        }
        
        console.log(`Processing inactive token ${processed + 1}/${allTokens.length}: ${mint}`);
        
        // Delete the token and all its related records
        await prisma.$transaction(async (tx) => {
          // Delete related records from all tables in the correct order to respect referential integrity
          
          // 1. Delete from hot_monitoring
          await tx.hot_monitoring.deleteMany({
            where: { mint }
          });
          
          // 2. Delete from pump_tokens
          await tx.pump_tokens.deleteMany({
            where: { mint }
          });
          
          // 3. Delete from rug_score
          await tx.rug_score.deleteMany({
            where: { mint }
          });
          
          // 4. Delete from pumpswapTokens
          await tx.pumpswapTokens.deleteMany({
            where: { mint }
          });
          
          // 5. Delete from tokenPools
          await tx.tokenPools.deleteMany({
            where: { mint }
          });
          
          // 6. Delete from hotTokens
          await tx.hotTokens.deleteMany({
            where: { mint }
          });
          
          // 7. Delete from sniperOrders
          await tx.sniperOrders.deleteMany({
            where: { mint }
          });
          
          // 8. Delete from transactions
          await tx.transactions.deleteMany({
            where: { mint }
          });
          
          // 9. Delete from raydium_tokens
          await tx.raydium_tokens.deleteMany({
            where: { mint }
          });
          
          // 10. Finally, delete the token itself
          await tx.tokens.delete({
            where: { mint }
          });
        });
        
        deleted++;
        console.log(`Successfully deleted inactive token: ${mint}`);
      } catch (error) {
        failed++;
        console.error(`Error processing token ${mint}:`, error);
      }
      
      processed++;
      
      // Optional: Add a small delay between tokens to reduce database load
      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${allTokens.length} (${deleted} deleted, ${skipped} active, ${failed} failed)`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('Deletion process completed.');
    console.log(`Total tokens processed: ${processed}`);
    console.log(`Tokens still active (skipped): ${skipped}`);
    console.log(`Successfully deleted: ${deleted}`);
    console.log(`Failed: ${failed}`);
    
  } catch (error) {
    console.error('Error in deletion process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function




