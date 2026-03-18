const fs = require('fs');
const csv = require('csv-parser');

const results = [];
let rowCount = 0;

console.log(' Reading Amazon dataset...');

fs.createReadStream('amazon_sales_dataset.csv')
    .pipe(csv())
    .on('data', (row) => {
        rowCount++;
        
        const simplifiedRow = {
            order_id: row['order_id'] || '',
            order_date: row['order_date'] || '',
            customer_id: row['customer_id'] || '',
            customer_name: row['customer_name'] || '',
            product_name: row['product_name'] || '',
            category: row['category'] || '',
            quantity: parseInt(row['quantity'] || 1),
            unit_price: parseFloat(row['unit_price'] || 0).toFixed(2),
            total_sales: parseFloat(row['total_sales'] || 0).toFixed(2),
            payment_method: row['payment_method'] || 'Unknown'
        };
        
        if (simplifiedRow.order_id && simplifiedRow.product_name) {
            results.push(simplifiedRow);
        }
        
        if (rowCount % 1000 === 0) {
            console.log(`  Processed ${rowCount} rows...`);
        }
    })
    .on('end', () => {
        console.log(`\nProcessed ${rowCount} rows`);
        console.log(` Kept ${results.length} valid rows`);
        
        const headers = ['order_id', 'order_date', 'customer_id', 'customer_name', 
                        'product_name', 'category', 'quantity', 'unit_price', 
                        'total_sales', 'payment_method'];
        
        let csvContent = headers.join(',') + '\n';
        
        results.forEach(row => {
            const rowArray = headers.map(header => {
                let value = row[header] || '';
                if (value.toString().includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvContent += rowArray.join(',') + '\n';
        });
        
        fs.writeFileSync('amazon_sales_simplified.csv', csvContent);
        console.log(' Saved simplified dataset to amazon_sales_simplified.csv');
    });