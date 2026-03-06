import { connectDB, sequelize } from './src/config/db.js';
import { User, Trip } from './src/models/index.js';

async function testApi() {
	try {
		await connectDB();
		let user = await User.findOne();
		if (!user) {
			user = await User.create({
				name: 'Test',
				email: 'test@test.com',
				password: 'password'
			});
		}

		// Generate a token
		const token = user.generateAccessToken();
		// TODO: don't use direct url use variables using env
		const res = await fetch('http://localhost:8000/api/v1/trips', {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
		const data = await res.json();
		console.log('Success! Status:', res.status, 'Data:', data);
	} catch (error) {
		console.error('API Error occurred:', error.message);
	} finally {
		await sequelize.close();
	}
}

testApi();
