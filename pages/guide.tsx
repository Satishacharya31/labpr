import Head from 'next/head';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { useState } from 'react';

export default function GuidePage() {
    const [activeSection, setActiveSection] = useState('getting-started');

    const scrollTo = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-white pb-20">
            <Head>
                <title>User Guide - Campus Kit</title>
                <meta name="description" content="How to use Campus Kit for your projects" />
            </Head>

            <Navbar searchQuery="" setSearchQuery={() => { }} />

            <main className="pt-24 max-w-7xl mx-auto px-6 lg:px-12 flex gap-12">

                {/* Sidebar Navigation */}
                <aside className="w-64 hidden lg:block sticky top-24 h-[calc(100vh-6rem)]">
                    <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                        <h3 className="font-bold mb-4 px-2 text-lg">Contents</h3>
                        <nav className="space-y-1">
                            {[
                                { id: 'getting-started', label: 'Getting Started' },
                                { id: 'editor', label: 'Using the Editor' },
                                { id: 'assets', label: 'Managing Assets' },
                                { id: 'deployment', label: 'Publishing' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollTo(item.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id
                                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* content */}
                <div className="flex-1 max-w-3xl">
                    <h1 className="text-4xl font-bold mb-6">CampusKit User Guide</h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 mb-12">
                        Learn how to create, manage, and publish your interactive lab reports and projects.
                    </p>

                    <article className="space-y-16">

                        {/* Getting Started */}
                        <section id="getting-started" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">1</div>
                                Getting Started
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                                <p>
                                    Welcome to CampusKit! This platform allows you to create interactive web projects and host PDF documents easily.
                                    To start your first project:
                                </p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>Click the <span className="text-blue-500 font-bold">New Project</span> button on the top right of the dashboard.</li>
                                    <li>Enter a <strong>Project Name</strong> and <strong>Subject</strong> (e.g., Physics, Chemistry).</li>
                                    <li>Choose your project type: <strong>Code</strong> (HTML/CSS/JS) or <strong>PDF</strong>.</li>
                                </ol>
                            </div>
                        </section>

                        {/* Editor */}
                        <section id="editor" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm">2</div>
                                Using the Editor
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                                <p>The code editor is designed for real-time web development. It supports HTML, CSS, and JavaScript with live preview.</p>
                                <div className="bg-gray-100 dark:bg-black/30 p-4 rounded-lg border border-gray-200 dark:border-white/10 my-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Key Features:</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>Tabs:</strong> Switch between index.html, style.css, and script.js files.</li>
                                        <li><strong>Live Preview:</strong> Click the eye icon to see your changes instantly.</li>
                                        <li><strong>Mobile View:</strong> Toggle between desktop and mobile preview modes.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Assets */}
                        <section id="assets" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white text-sm">3</div>
                                Managing Assets
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                                <p>You can upload images, PDFs, and other files to use in your projects.</p>

                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-6">Relative Paths</h3>
                                <p>
                                    When you upload an asset, you can reference it in your code using a simple relative path:
                                </p>
                                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                                    <code>&lt;!-- HTML example --&gt;
                                        &lt;img src="assets/my-image.png" /&gt;

                                        /* CSS example */
                                        .background &#123;
                                        background-image: url("assets/bg-pattern.png");
                                        &#125;</code>
                                </pre>
                                <p className="text-sm italic">
                                    Note: CampusKit automatically resolves these paths to the correct URL when you preview or publish.
                                </p>
                            </div>
                        </section>

                        {/* Deployment */}
                        <section id="deployment" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white text-sm">4</div>
                                Publishing
                            </h2>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                                <p>
                                    Once you are happy with your project, click the <span className="text-green-600 dark:text-green-400 font-bold">Deploy</span> button.
                                </p>
                                <p>
                                    Published projects appear on the main dashboard and can be viewed by anyone with the link. You can update your deployed project at any time by saving changes and deploying again.
                                </p>
                            </div>
                        </section>

                    </article>
                </div>
            </main>
        </div>
    );
}
