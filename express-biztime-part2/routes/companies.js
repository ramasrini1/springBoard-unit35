/** Routes for biztime. */

const express = require("express");
const ExpressError = require("../expressError")
const slugify = require("slugify");
const router = express.Router();
const db = require("../db");

/** GET / => list of companies.
 *
 * =>  {companies: [{code, name, descrip}, {code, name, descrip}, ...]}
 *
 * */
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`SELECT code, name FROM companies`);
    return res.json({ companies: results.rows })
  } catch (e) {
    return next(e);
  }
})

/** GET /[code] => detail on company
 *
 * =>  {company: {code, name, descrip, invoices: [id, ...]}}
 *
 * */

router.get('/:code', async (req, res, next) => {
    try {
      const { code } = req.params;
      const compResult = await db.query(`SELECT 
      c.code,
      c.name,
      c.description
      FROM companies AS c 
      Where c.code=$1`, [code]);
     
      const invResult = await db.query(
        `SELECT 
        i.id FROM invoices As i
        Where i.comp_code=$1`, [code]);
      
      if (compResult.rows.length === 0) {
        throw new ExpressError(`Can't find company with code of ${code}`, 404)
      }
      const company = compResult.rows[0];
      const invoices = invResult.rows;
      
      invoices.map(item => item.id)
      company.invoices = invoices.map(item => item.id)

      return res.send({ "company": company });
    } catch (e) {
      return next(e)
    }
  })

/** POST / => add new company
 *
 * {name, descrip}  =>  {company: {code, name, descrip}}
 *
 * */

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    let code = slugify(name, {lower: true});

    const results = await db.query('INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description', [code,name, description]);
    return res.status(201).json({ company: results.rows[0] })
  } catch (e) {
    return next(e)
  }
})


/** PUT /[code] => update company
 *
 * {name, descrip}  =>  {company: {code, name, descrip}}
 *
 * */
router.put('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;
    
    const results = await db.query(
      `UPDATE companies 
        SET name=$1, description=$2 
        WHERE code=$3 
        RETURNING code, name, description`, 
        [name, description, code]);
    
    if (results.rows.length === 0) {
      throw new ExpressError(`Can't update company with code of ${code}`, 404)
    }
    return res.send({ company: results.rows[0] })
  } catch (e) {
    return next(e)
  }
})

/** DELETE /[code] => delete company
 *
 * => {status: "added"}
 *
 */

router.delete("/:code", async function (req, res, next) {
  try {
    let code = req.params.code;

    const result = await db.query(
          `DELETE FROM companies
           WHERE code=$1
           RETURNING code`,
        [code]);

    if (result.rows.length == 0) {
      throw new ExpressError(`No such company: ${code}`, 404)
    } else {
      return res.json({"status": "deleted"});
    }
  }

  catch (err) {
    return next(err);
  }
});

module.exports = router;