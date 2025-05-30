'use server';

import {z} from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce.number().gt(0, {message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string(),
})

const CreateInvoice = FormSchema.omit({id: true, date: true});

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
};

export async function createInvoice(prevState: State ,formData: FormData) {
    // Validate form fields using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

    console.log(validatedFields);

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    // Prepare data for insertion into the database
    const {customerId, amount, status} = validatedFields.data;
    // Test it out:
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    // Insert data into the database
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
    } catch(e) {
        // If a database error occurs, return a more specific error.
        console.log(e);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // Revalidate the cache for the invoices page and redirect the user
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Edit 
// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, prevState: State ,formData: FormData) {
    // Validate form fields using Zod
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
   
    const amountInCents = amount * 100;
   
    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}`;
    } catch(e) {
        console.log(e);
        return { message: 'Database Error: Failed to Update Invoice.'}
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}
//   Delete
export async function deleteInvoice(id: string) {    
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch(e) {
        // We'll log the error to the console for now
        console.log(e);
    }
    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      // Attempt to sign in with 'credentials' provider
      await signIn('credentials', formData);
    } catch (error) {
      // Kiểm tra nếu lỗi là đối tượng Error
      if (error instanceof Error) {
        // Kiểm tra lỗi cụ thể và trả về thông báo lỗi
        if (error.message.includes('CredentialsSignin')) {
          return 'Invalid credentials.';
        }
        return 'Something went wrong.';
      }
      // Nếu lỗi không phải là instance của Error, ném lỗi lên trên
      throw error;
    }
  }
  