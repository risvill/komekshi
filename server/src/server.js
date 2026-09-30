const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const authMiddleware = require('./authMiddleware');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Komekshi server is running'
  });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      message: 'Database connection works',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Database connection failed'
    });
  }
});

app.get('/clients', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, created_at
       FROM clients
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch clients'
    });
  }
});

app.post('/clients', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'Client name is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO clients (id, user_id, name, phone)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, name, phone, created_at`,
      [
        req.user.id,
        name,
        phone || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to create client'
    });
  }
});

app.get('/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const clientResult = await pool.query(
      `
      SELECT
        id,
        name,
        phone,
        created_at
      FROM clients
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Клиент не найден',
      });
    }

    const ordersResult = await pool.query(
      `
      SELECT
        o.id,
        o.status,
        o.total,
        o.order_date,
        o.order_time,
        o.address,
        o.created_at,

        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'unit', oi.unit
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items

      FROM orders o

      LEFT JOIN order_items oi
        ON oi.order_id = o.id

      WHERE o.client_id = $1
        AND o.user_id = $2

      GROUP BY o.id

      ORDER BY
        o.order_date DESC NULLS LAST,
        o.order_time DESC NULLS LAST,
        o.created_at DESC
      `,
      [id, req.user.id]
    );

    const orders = ordersResult.rows;

    const latestOrder = orders[0] || null;

    res.json({
      client: clientResult.rows[0],
      orders,
      latest_address: latestOrder?.address || null,
    });
  } catch (error) {
    console.error('Failed to get client details:', error);

    res.status(500).json({
      message: 'Не удалось загрузить данные клиента',
    });
  }
});

app.patch('/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Имя клиента обязательно',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE clients
      SET
        name = $1,
        phone = $2
      WHERE id = $3
        AND user_id = $4
      RETURNING id, name, phone, created_at
      `,
      [
        name.trim(),
        phone?.trim() || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Клиент не найден',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update client:', error);

    res.status(500).json({
      message: 'Не удалось обновить клиента',
    });
  }
});

app.get('/orders', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        o.id,
        o.client_id,
        c.name AS client_name,
        o.status,
        o.subtotal,
        o.discount_type,
        o.discount_value,
        o.total,
        o.order_date,
        o.order_time,
        o.address,
        o.wishes,
        o.created_at,
        o.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'name', oi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'unit', oi.unit
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN clients c
        ON c.id = o.client_id
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id, c.name
      ORDER BY
        o.order_date ASC NULLS LAST,
        o.order_time ASC NULLS LAST,
        o.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get orders:', error);

    res.status(500).json({
      message: 'Не удалось загрузить заказы',
    });
  }
});

app.post('/orders', authMiddleware, async (req, res) => {
  const {
    client_id,
    discount_type,
    discount_value,
    order_date,
    order_time,
    address,
    wishes,
    items,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message: 'Заказ должен содержать хотя бы один товар',
      });
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    let total = subtotal;

    if (discount_type === 'PERCENT') {
      total = subtotal - (subtotal * Number(discount_value || 0)) / 100;
    }

    if (discount_type === 'FIXED') {
      total = subtotal - Number(discount_value || 0);
    }

    total = Math.max(total, 0);

    const orderResult = await client.query(
      `
      INSERT INTO orders (
        user_id,
        client_id,
        subtotal,
        discount_type,
        discount_value,
        total,
        order_date,
        order_time,
        address,
        wishes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        req.user.id,
        client_id || null,
        subtotal,
        discount_type || null,
        discount_value || null,
        total,
        order_date || null,
        order_time || null,
        address || null,
        wishes || null,
      ]
    );

    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          name,
          quantity,
          price,
          unit
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          order.id,
          item.product_id || null,
          item.name,
          item.quantity,
          item.price,
          item.unit,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Failed to create order:', error);

    res.status(500).json({
      message: 'Не удалось создать заказ',
    });
  } finally {
    client.release();
  }
});
app.patch('/orders/:id/status', authMiddleware, async (req, res) => {
const { status } = req.body;
const { id } = req.params;

const allowedStatuses = [
'DRAFT',
'ACCEPTED',
'IN_PROGRESS',
'AWAITING_PICKUP',
'COMPLETED',
'CANCELLED',
];

if (!allowedStatuses.includes(status)) {
return res.status(400).json({
message: 'Недопустимый статус заказа',
});
}

try {
const result = await pool.query(
'UPDATE orders ' +
'SET status = $1, updated_at = now() ' +
'WHERE id = $2 AND user_id = $3 ' +
'RETURNING *',
[status, id, req.user.id]
);

if (result.rows.length === 0) {
return res.status(404).json({
message: 'Заказ не найден',
});
}

res.json(result.rows[0]);
} catch (error) {
console.error('Failed to update order status:', error);

res.status(500).json({
message: 'Не удалось изменить статус заказа',
});
}
});

app.get('/products', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        price,
        unit,
        pieces_per_portion,
        is_active
      FROM products
      WHERE user_id = $1
        AND is_active = true
      ORDER BY name ASC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({
      message: 'Не удалось загрузить товары',
    });
  }
});

app.post('/products', authMiddleware, async (req, res) => {
  const {
    name,
    price,
    unit,
    pieces_per_portion,
  } = req.body;

  if (!name || price === undefined || !unit) {
    return res.status(400).json({
      message: 'Название, цена и единица измерения обязательны',
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO products (
        user_id,
        name,
        price,
        unit,
        pieces_per_portion
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        req.user.id,
        name.trim(),
        price,
        unit,
        pieces_per_portion ?? null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create product:', error);

    res.status(500).json({
      message: 'Не удалось создать товар',
    });
  }
});

app.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        type,
        is_active,
        created_at,
        updated_at
      FROM accounts
      WHERE user_id = $1
      ORDER BY
        is_active DESC,
        name ASC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get accounts:', error);

    res.status(500).json({
      message: 'Не удалось загрузить счета',
    });
  }
});

app.post('/accounts', authMiddleware, async (req, res) => {
  const { name, type } = req.body;

  const allowedTypes = [
    'KASPI',
    'CASH',
  ];

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Название счёта обязательно',
    });
  }

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      message: 'Недопустимый тип счёта',
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO accounts (
        id,
        user_id,
        name,
        type,
        is_active
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        true
      )
      RETURNING *
      `,
      [
        req.user.id,
        name.trim(),
        type,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create account:', error);

    res.status(500).json({
      message: 'Не удалось создать счёт',
    });
  }
});

app.get('/orders/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.order_id,
        p.account_id,
        p.amount,
        p.payment_date,
        p.created_at,
        a.name AS account_name,
        a.type AS account_type
      FROM payments p
      JOIN accounts a
        ON a.id = p.account_id
      JOIN orders o
        ON o.id = p.order_id
      WHERE p.order_id = $1
        AND o.user_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
      `,
      [id, req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get order payments:', error);

    res.status(500).json({
      message: 'Не удалось загрузить платежи',
    });
  }
});

app.post('/orders/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { account_id, amount, payment_date } = req.body;

  if (!account_id || amount === undefined) {
    return res.status(400).json({
      message: 'Счёт и сумма обязательны',
    });
  }

  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({
      message: 'Сумма платежа должна быть больше 0',
    });
  }

  try {
    const orderResult = await pool.query(
      `
      SELECT id, total
      FROM orders
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Заказ не найден',
      });
    }

    const accountResult = await pool.query(
      `
      SELECT id
      FROM accounts
      WHERE id = $1
        AND user_id = $2
        AND is_active = true
      `,
      [account_id, req.user.id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        message: 'Счёт не найден или отключён',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO payments (
        id,
        order_id,
        account_id,
        amount,
        payment_date
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        id,
        account_id,
        paymentAmount,
        payment_date || new Date().toISOString(),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create payment:', error);

    res.status(500).json({
      message: 'Не удалось добавить платёж',
    });
  }
});

app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.title,
        t.status,
        t.deadline,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'client_name', c.name,
              'order_date', o.order_date,
              'order_time', o.order_time,
              'total', o.total
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS orders
      FROM tasks t
      LEFT JOIN task_orders to_link
        ON to_link.task_id = t.id
      LEFT JOIN orders o
        ON o.id = to_link.order_id
      LEFT JOIN clients c
        ON c.id = o.client_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY
        t.deadline IS NULL,
        t.deadline ASC,
        t.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get tasks:', error);

    res.status(500).json({
      message: 'Не удалось загрузить задачи',
    });
  }
});

app.get('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.user_id,
        t.title,
        t.status,
        t.deadline,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'client_name', c.name
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS orders
      FROM tasks t
      LEFT JOIN task_orders tor
        ON tor.task_id = t.id
      LEFT JOIN orders o
        ON o.id = tor.order_id
      LEFT JOIN clients c
        ON c.id = o.client_id
      WHERE t.id = $1
        AND t.user_id = $2
      GROUP BY t.id
      `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Task not found',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to load task',
    });
  }
});

app.post('/tasks', authMiddleware, async (req, res) => {
  const { title, deadline, order_ids } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      message: 'Название задачи обязательно',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `
      INSERT INTO tasks (
        id,
        user_id,
        title,
        status,
        deadline
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        'TODO',
        $3
      )
      RETURNING *
      `,
      [
        req.user.id,
        title.trim(),
        deadline || null,
      ]
    );

    const task = taskResult.rows[0];

    if (Array.isArray(order_ids)) {
      for (const orderId of order_ids) {
        await client.query(
          `
          INSERT INTO task_orders (
            task_id,
            order_id
          )
          SELECT $1, $2
          WHERE EXISTS (
            SELECT 1
            FROM orders
            WHERE id = $2
              AND user_id = $3
          )
          ON CONFLICT DO NOTHING
          `,
          [
            task.id,
            orderId,
            req.user.id,
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json(task);
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Failed to create task:', error);

    res.status(500).json({
      message: 'Не удалось создать задачу',
    });
  } finally {
    client.release();
  }
});

app.patch('/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, deadline } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      message: 'Название задачи обязательно',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = $1,
        deadline = $2,
        updated_at = now()
      WHERE id = $3
        AND user_id = $4
      RETURNING *
      `,
      [
        title.trim(),
        deadline || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update task:', error);

    res.status(500).json({
      message: 'Не удалось изменить задачу',
    });
  }
});

app.patch('/tasks/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    'TODO',
    'IN_PROGRESS',
    'DONE',
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Недопустимый статус задачи',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE tasks
      SET
        status = $1,
        updated_at = now()
      WHERE id = $2
        AND user_id = $3
      RETURNING *
      `,
      [
        status,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update task status:', error);

    res.status(500).json({
      message: 'Не удалось изменить статус задачи',
    });
  }
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      DELETE FROM task_orders
      WHERE task_id = $1
        AND EXISTS (
          SELECT 1
          FROM tasks
          WHERE tasks.id = $1
            AND tasks.user_id = $2
        )
      `,
      [id, req.user.id]
    );

    const result = await client.query(
      `
      DELETE FROM tasks
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Задача удалена',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete task:', error);

    res.status(500).json({
      message: 'Не удалось удалить задачу',
    });
  } finally {
    client.release();
  }
});

app.get('/orders/:id/tasks', authMiddleware, async (req, res) => {
try {
const { id } = req.params;

const result = await pool.query(
  `
  SELECT
    t.id,
    t.title,
    t.status,
    t.deadline,
    t.created_at,
    t.updated_at
  FROM tasks t
  JOIN task_orders to_link
    ON to_link.task_id = t.id
  WHERE to_link.order_id = $1
    AND t.user_id = $2
  ORDER BY
    t.deadline ASC NULLS LAST,
    t.created_at DESC
  `,
  [id, req.user.id]
);

res.json(result.rows);

} catch (error) {
console.error('Failed to get tasks for order:', error);

res.status(500).json({
  message: 'Failed to get tasks for order'
});

}
});

app.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, business_name } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
       (id, name, phone, email, password, business_name)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, name, phone, email, business_name, created_at`,
      [
        name,
        phone || null,
        email,
        passwordHash,
        business_name || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to register user'
    });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const result = await pool.query(
      'SELECT id, name, phone, email, password, business_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
    token,
    user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        business_name: user.business_name
    }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Login failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Komekshi server is running on port ${PORT}`);
});