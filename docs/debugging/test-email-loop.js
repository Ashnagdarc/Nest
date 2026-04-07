// Test sending emails in a loop like the code does
const { Resend } = require('resend');

const resend = new Resend('re_WDkzyPJg_4iPnpK95iAGvtwV2gYKqcbML');

async function testEmailLoop() {
    console.log('📧 Testing email loop with both admins...\n');
    
    const admins = [
        { email: 'adira@edenoasisrealty.com', full_name: 'Adira Eseyin' },
        { email: 'hr@edenoasisrealty.com', full_name: 'Ecktale Omoighe' }
    ];
    
    console.log('Starting loop through admins...\n');
    
    for (const admin of admins) {
        console.log(`→ Processing: ${admin.email}`);
        
        if (admin.email) {
            console.log('  ✓ Email exists, attempting to send...');
            
            try {
                const result = await resend.emails.send({
                    from: 'Nest by Eden Oasis <noreply@nestbyeden.app>',
                    to: admin.email,
                    subject: `🧪 Loop Test - ${admin.full_name}`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                            <body style="font-family: Arial; padding: 20px;">
                                <h2>Hello ${admin.full_name || 'Admin'},</h2>
                                <p>This is email #${admins.indexOf(admin) + 1} in the loop test.</p>
                                <p>Testing if emails are sent to all admins in sequence.</p>
                                <p>Time: ${new Date().toISOString()}</p>
                            </body>
                        </html>
                    `
                });
                
                console.log(`  ✅ SUCCESS! Email ID: ${result.data?.id || result.id}`);
                console.log('');
                
            } catch (emailError) {
                console.error(`  ❌ FAILED for ${admin.email}`);
                console.error(`  Error message: ${emailError.message}`);
                console.error(`  Error details:`, emailError);
                console.log('');
            }
        } else {
            console.log('  ❌ Email is empty, skipping');
            console.log('');
        }
    }
    
    console.log('✅ Loop complete!');
    console.log('Check Resend dashboard - you should see 2 emails sent');
}

testEmailLoop().catch(console.error);
