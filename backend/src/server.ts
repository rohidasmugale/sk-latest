import dotenv from "dotenv";
dotenv.config();
import { app } from './app';

try {
  const PORT = process.env.PORT || 5001;

 
  app.listen(PORT, () => {
    console.log(`\n✅ Server is running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.MONGODB_URI?.split('@')[1] || 'Not configured'}`);
  });
  
} catch (error: any) {
  console.error('❌ Server failed to start:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}