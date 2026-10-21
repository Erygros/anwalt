import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {adminDb} from '@/lib/supabase/server';
export const runtime='nodejs';
export async function POST(request:Request){if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return NextResponse.json({error:'Not configured'},{status:503});const signature=request.headers.get('stripe-signature');if(!signature)return NextResponse.json({error:'Signature required'},{status:400});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid signature'},{status:400});}
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){const session=event.data.object as Stripe.Checkout.Session;if(session.payment_status==='paid'){const id=session.metadata?.invoice_id;if(!id||!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'Missing invoice'},{status:400});const {error}=await adminDb().rpc('record_payment',{p_event:event.id,p_invoice:id,p_session:session.id,p_amount:session.amount_total,p_currency:session.currency});if(error)return NextResponse.json({error:'Payment not reconciled'},{status:500});}}
  return NextResponse.json({received:true});
}
