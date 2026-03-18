const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'amazon_sales',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});


pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
    release();
});




app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Amazon Sales API is running' });
});


app.get('/api/sales', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            'SELECT * FROM sales ORDER BY order_date DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        
        const countResult = await pool.query('SELECT COUNT(*) FROM sales');
        
        res.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/sales/:order_id', async (req, res) => {
    try {
        const { order_id } = req.params;
        const result = await pool.query('SELECT * FROM sales WHERE order_id = $1', [order_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/sales/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await pool.query(
            'SELECT * FROM sales WHERE category = $1 ORDER BY order_date DESC',
            [category]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/sales/date-range', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end dates are required' });
        }
        
        const result = await pool.query(
            'SELECT * FROM sales WHERE order_date BETWEEN $1 AND $2 ORDER BY order_date',
            [start, end]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/summary/monthly', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM monthly_sales_summary');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/summary/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM category_performance');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/summary/payment-methods', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payment_method_analysis');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/customers/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await pool.query(
            `SELECT customer_id, customer_name, 
             COUNT(*) as order_count, 
             SUM(total_sales) as total_spent,
             AVG(total_sales) as avg_order_value
             FROM sales 
             GROUP BY customer_id, customer_name 
             ORDER BY total_spent DESC 
             LIMIT $1`,
            [limit]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.get('/api/customers/:customer_id', async (req, res) => {
    try {
        const { customer_id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM sales WHERE customer_id = $1 ORDER BY order_date DESC',
            [customer_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        
        const summary = {
            total_orders: result.rows.length,
            total_spent: result.rows.reduce((sum, order) => sum + parseFloat(order.total_sales), 0),
            avg_order_value: result.rows.reduce((sum, order) => sum + parseFloat(order.total_sales), 0) / result.rows.length,
            categories: [...new Set(result.rows.map(order => order.category))],
            payment_methods: [...new Set(result.rows.map(order => order.payment_method))]
        };
        
        res.json({
            customer_info: {
                customer_id: result.rows[0].customer_id,
                customer_name: result.rows[0].customer_name
            },
            summary,
            orders: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});


app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, pool };