import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Documentation - Nest by Eden Oasis',
    description: 'Comprehensive documentation for the Nest asset management system',
    robots: 'noindex, nofollow', // Prevent search engine indexing
}

export default function DocumentationPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">Nest Documentation</h1>
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Internal Use Only
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Version 1.0.0 • Last updated: {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <nav className="lg:col-span-1">
                        <div className="sticky top-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contents</h2>
                            <ul className="space-y-2">
                                <li><a href="#overview" className="text-blue-600 hover:text-blue-800">Overview</a></li>
                                <li><a href="#getting-started" className="text-blue-600 hover:text-blue-800">Getting Started</a></li>
                                <li><a href="#user-guide" className="text-blue-600 hover:text-blue-800">User Guide</a></li>
                                <li><a href="#admin-guide" className="text-blue-600 hover:text-blue-800">Admin Guide</a></li>
                                <li><a href="#api-reference" className="text-blue-600 hover:text-blue-800">API Reference</a></li>
                                <li><a href="#troubleshooting" className="text-blue-600 hover:text-blue-800">Troubleshooting</a></li>
                                <li><a href="#development" className="text-blue-600 hover:text-blue-800">Development</a></li>
                            </ul>
                        </div>
                    </nav>

                    {/* Main Content */}
                    <main className="lg:col-span-3">
                        <div className="bg-white shadow rounded-lg p-8">

                            {/* Overview Section */}
                            <section id="overview" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Overview</h2>
                                <div className="prose max-w-none">
                                    <p className="text-lg text-gray-600 mb-4">
                                        Nest is a comprehensive asset management system designed for organizations to efficiently track,
                                        manage, and allocate equipment, vehicles, and resources. Built with modern technologies including
                                        Next.js, TypeScript, and Supabase.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                        <div className="bg-blue-50 p-6 rounded-lg">
                                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Key Features</h3>
                                            <ul className="text-blue-800 space-y-1">
                                                <li>• Real-time equipment tracking</li>
                                                <li>• Role-based access control</li>
                                                <li>• Automated workflow management</li>
                                                <li>• Comprehensive reporting</li>
                                                <li>• Mobile-responsive design</li>
                                            </ul>
                                        </div>
                                        <div className="bg-green-50 p-6 rounded-lg">
                                            <h3 className="text-lg font-semibold text-green-900 mb-2">Technology Stack</h3>
                                            <ul className="text-green-800 space-y-1">
                                                <li>• Frontend: Next.js 15, TypeScript</li>
                                                <li>• Styling: Tailwind CSS, shadcn/ui</li>
                                                <li>• Backend: Supabase (PostgreSQL)</li>
                                                <li>• Authentication: Supabase Auth</li>
                                                <li>• Deployment: Vercel</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Getting Started Section */}
                            <section id="getting-started" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">For Users</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                                <li>Navigate to the login page and create an account or sign in</li>
                                                <li>Browse available equipment in the catalog</li>
                                                <li>Submit equipment requests through the request form</li>
                                                <li>Wait for admin approval of your request</li>
                                                <li>Check out approved equipment and return on time</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">For Administrators</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                                <li>Access the admin dashboard with admin credentials</li>
                                                <li>Review and approve pending equipment requests</li>
                                                <li>Manage equipment inventory and user accounts</li>
                                                <li>Monitor system analytics and generate reports</li>
                                                <li>Configure system settings and notifications</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* User Guide Section */}
                            <section id="user-guide" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">User Guide</h2>

                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Browsing Equipment</h3>
                                        <p className="text-gray-600 mb-3">
                                            The equipment catalog displays all available items with detailed information including:
                                        </p>
                                        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                                            <li>Equipment name, description, and specifications</li>
                                            <li>Current status (Available, Checked Out, Maintenance)</li>
                                            <li>Equipment condition and images</li>
                                            <li>Category and brand information</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Making Requests</h3>
                                        <p className="text-gray-600 mb-3">
                                            To request equipment, follow these steps:
                                        </p>
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <ol className="list-decimal list-inside space-y-2 text-blue-800">
                                                <li>Select equipment from the catalog</li>
                                                <li>Fill out the request form with details</li>
                                                <li>Specify duration and purpose</li>
                                                <li>Add team members if applicable</li>
                                                <li>Submit for admin approval</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Check-in/Check-out Process</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-green-900 mb-2">Check-out</h4>
                                                <ul className="text-green-800 text-sm space-y-1">
                                                    <li>• Receive approval notification</li>
                                                    <li>• Scan QR code or use check-out page</li>
                                                    <li>• Confirm equipment condition</li>
                                                    <li>• Equipment status updates automatically</li>
                                                </ul>
                                            </div>
                                            <div className="bg-orange-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-orange-900 mb-2">Check-in</h4>
                                                <ul className="text-orange-800 text-sm space-y-1">
                                                    <li>• Return equipment on time</li>
                                                    <li>• Scan QR code or use check-in page</li>
                                                    <li>• Report any damage or issues</li>
                                                    <li>• Equipment becomes available again</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Admin Guide Section */}
                            <section id="admin-guide" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Admin Guide</h2>

                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Dashboard Overview</h3>
                                        <p className="text-gray-600 mb-4">
                                            The admin dashboard provides comprehensive control over the asset management system:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-purple-900 mb-2">Analytics</h4>
                                                <p className="text-purple-800 text-sm">Real-time metrics, utilization reports, and performance indicators</p>
                                            </div>
                                            <div className="bg-indigo-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-indigo-900 mb-2">Management</h4>
                                                <p className="text-indigo-800 text-sm">Equipment inventory, user accounts, and request processing</p>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-blue-900 mb-2">Configuration</h4>
                                                <p className="text-blue-800 text-sm">System settings, notifications, and access controls</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Request Management</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-gray-900 mb-2">Approval Process</h4>
                                            <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                                <li>Review pending requests in the admin dashboard</li>
                                                <li>Check equipment availability and user permissions</li>
                                                <li>Approve, deny, or request additional information</li>
                                                <li>Send automated notifications to users</li>
                                                <li>Update equipment status upon approval</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Equipment Management</h3>
                                        <div className="space-y-4">
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-green-900 mb-2">Adding Equipment</h4>
                                                <ul className="text-green-800 text-sm space-y-1">
                                                    <li>• Navigate to Equipment Management</li>
                                                    <li>• Fill out equipment details form</li>
                                                    <li>• Upload equipment images</li>
                                                    <li>• Set initial status and condition</li>
                                                    <li>• Generate QR codes for tracking</li>
                                                </ul>
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-yellow-900 mb-2">Maintenance Tracking</h4>
                                                <ul className="text-yellow-800 text-sm space-y-1">
                                                    <li>• Monitor equipment condition</li>
                                                    <li>• Schedule maintenance activities</li>
                                                    <li>• Update equipment status</li>
                                                    <li>• Track repair history</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* API Reference Section */}
                            <section id="api-reference" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">API Reference</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h3>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                            <pre className="text-sm">
                                                {`POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/user

Headers:
Authorization: Bearer <jwt-token>`}
                                            </pre>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Equipment Endpoints</h3>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                            <pre className="text-sm">
                                                {`GET    /api/gears              # List equipment
POST   /api/gears              # Create equipment
GET    /api/gears/:id          # Get equipment details
PUT    /api/gears/:id          # Update equipment
DELETE /api/gears/:id          # Delete equipment
GET    /api/gears/available    # Get available equipment
GET    /api/gears/popular      # Get popular equipment`}
                                            </pre>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Request Endpoints</h3>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                            <pre className="text-sm">
                                                {`GET    /api/requests           # List requests
POST   /api/requests           # Create request
GET    /api/requests/:id       # Get request details
PUT    /api/requests/:id       # Update request
DELETE /api/requests/:id       # Cancel request
GET    /api/requests/user      # Get user requests`}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Troubleshooting Section */}
                            <section id="troubleshooting" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Troubleshooting</h2>

                                <div className="space-y-6">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-red-900 mb-2">Common Issues</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="font-medium text-red-800">Authentication Problems</h4>
                                                <p className="text-red-700 text-sm">Clear browser cache and cookies, then try logging in again.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-red-800">Equipment Not Showing</h4>
                                                <p className="text-red-700 text-sm">Check if equipment status is set to "Available" and you have proper permissions.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-red-800">Request Not Approved</h4>
                                                <p className="text-red-700 text-sm">Contact your administrator to check request status and approval workflow.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Support Contact</h3>
                                        <p className="text-blue-800 text-sm mb-2">
                                            For technical support or questions about the system:
                                        </p>
                                        <ul className="text-blue-800 text-sm space-y-1">
                                            <li>• Email: support@edenoasis.com</li>
                                            <li>• Documentation: docs.nest.edenoasis.com</li>
                                            <li>• System Status: status.nest.edenoasis.com</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Development Section */}
                            <section id="development" className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">Development</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Local Development</h3>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                            <pre className="text-sm">
                                                {`# Clone repository
git clone https://github.com/your-org/nest.git
cd nest

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build`}
                                            </pre>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Database Schema</h3>
                                        <p className="text-gray-600 mb-3">
                                            Key database tables and their purposes:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-2">Core Tables</h4>
                                                <ul className="text-gray-700 text-sm space-y-1">
                                                    <li>• profiles - User accounts</li>
                                                    <li>• gears - Equipment inventory</li>
                                                    <li>• gear_requests - Request management</li>
                                                    <li>• gear_activity_log - Audit trail</li>
                                                </ul>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-2">Supporting Tables</h4>
                                                <ul className="text-gray-700 text-sm space-y-1">
                                                    <li>• notifications - System alerts</li>
                                                    <li>• announcements - System messages</li>
                                                    <li>• gear_maintenance - Maintenance records</li>
                                                    <li>• gear_calendar_bookings - Scheduling</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Footer */}
                            <div className="border-t pt-8 mt-12">
                                <div className="text-center text-gray-500 text-sm">
                                    <p>This documentation is for internal use only and should not be shared publicly.</p>
                                    <p className="mt-2">
                                        © 2024 Eden Oasis. All rights reserved.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
