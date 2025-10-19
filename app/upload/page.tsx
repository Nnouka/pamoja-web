'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Headphones, Image as ImageIcon, ArrowLeft, Edit, File } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { Note } from '@/lib/types';
import { generateChallenges, extractContentFromFile } from '@/lib/ai-utils';
import Link from 'next/link';

function UploadContent() {
  const { currentUser, userProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'write'>('upload');
  const [markdownContent, setMarkdownContent] = useState('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const getFileType = (file: File): Note['fileType'] => {
    const type = file.type.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('audio')) return 'audio';
    if (type.includes('image')) return 'image';
    return 'text';
  };

  const getFileIcon = (fileType: Note['fileType']) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />;
      case 'audio':
        return <Headphones className="h-8 w-8 text-green-600" />;
      case 'image':
        return <ImageIcon className="h-8 w-8 text-blue-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !userProfile || !title) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a reference to the file location in Firebase Storage
      const fileRef = ref(storage, `notes/${userProfile.id}/${Date.now()}-${selectedFile.name}`);
      
      // Start the upload
      const uploadTask = uploadBytesResumable(fileRef, selectedFile);

      // Monitor upload progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload failed:', error);
          alert('Upload failed: ' + error.message);
          setUploading(false);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            console.log('File uploaded successfully. User profile:', userProfile);
            console.log('User ID from profile:', userProfile.id);
            console.log('Current user from auth:', userProfile);
            
            // Create note document in Firestore
            const noteData: Omit<Note, 'id'> = {
              userId: userProfile.id,
              title,
              fileUrl: downloadURL,
              fileName: selectedFile.name,
              fileType: getFileType(selectedFile),
              tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
              ...(subject && { subject }), // Only include subject if it has a value
            };

            console.log('Saving note to Firestore:', noteData);
            const noteRef = await addDoc(collection(db, 'notes'), noteData);
            console.log('Note saved successfully with ID:', noteRef.id);
            
            // Generate challenges automatically
            try {
              console.log('Extracting content from file...');
              const content = await extractContentFromFile(selectedFile);
              console.log('Content extracted, generating challenges...');
              
              const challengesResponse = await generateChallenges({
                content,
                fileType: getFileType(selectedFile),
                tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
                difficulty: 'medium',
                count: 5,
                ...(subject && { subject }), // Only include subject if it has a value
              });

              console.log('Challenges generated:', challengesResponse.challenges.length);

              // Save challenges to database
              for (const challengeData of challengesResponse.challenges) {
                console.log('Saving challenge:', challengeData);
                const challengeRef = await addDoc(collection(db, 'challenges'), {
                  noteId: noteRef.id,
                  userId: userProfile.id,
                  ...challengeData,
                  createdAt: Timestamp.now()
                });
                console.log('Challenge saved with ID:', challengeRef.id);
              }
              console.log('All challenges saved successfully');
            } catch (error) {
              console.error('Error generating or saving challenges:', error);
              // Continue anyway - file was uploaded successfully
            }
            
            // Reset form
            setSelectedFile(null);
            setTitle('');
            setSubject('');
            setTags('');
            setUploadProgress(0);
            setUploading(false);
            
            alert('File uploaded and challenges generated successfully!');
          } catch (error) {
            console.error('Error saving note:', error);
            alert('Error saving note: ' + (error as Error).message);
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload error: ' + (error as Error).message);
      setUploading(false);
    }
  };

  const saveMarkdownNote = async () => {
    if (!markdownContent || !title || !currentUser?.uid) {
      return;
    }

    setUploading(true);

    try {
      console.log('Saving markdown note for user:', currentUser.uid);

      // Create note document in Firestore (no file upload needed for markdown)
      const noteData: Omit<Note, 'id'> = {
        userId: currentUser.uid,
        title,
        content: markdownContent, // Store markdown content directly
        fileType: 'text',
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(subject && { subject }), // Only include subject if it has a value
      };

      console.log('Saving markdown note to Firestore:', noteData);
      const noteRef = await addDoc(collection(db, 'notes'), noteData);
      console.log('Markdown note saved successfully with ID:', noteRef.id);
      
      // Generate challenges from markdown content
      try {
        console.log('Generating challenges from markdown content...');
        
        const challengesResponse = await generateChallenges({
          content: markdownContent,
          fileType: 'text',
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          difficulty: 'medium',
          count: 5,
          ...(subject && { subject }), // Only include subject if it has a value
        });

        console.log('Challenges generated:', challengesResponse.challenges.length);

        // Save challenges to database
        for (const challengeData of challengesResponse.challenges) {
          console.log('Saving challenge:', challengeData);
          const challengeRef = await addDoc(collection(db, 'challenges'), {
            noteId: noteRef.id,
            userId: currentUser.uid,
            ...challengeData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log('Challenge saved with ID:', challengeRef.id);
        }

      } catch (challengeError) {
        console.error('Error generating challenges:', challengeError);
        alert('Note saved but failed to generate challenges. You can generate them later.');
      }

      // Reset form
      setMarkdownContent('');
      setTitle('');
      setSubject('');
      setTags('');
      setUploading(false);
      
      alert('Markdown note saved and challenges generated successfully!');
    } catch (error) {
      console.error('Error saving markdown note:', error);
      alert('Error saving note: ' + (error as Error).message);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/dashboard" className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'upload' ? 'Upload Learning Materials' : 'Write Your Notes'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('write')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'write'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit className="w-4 h-4 mr-2" />
              Write Notes
            </button>
          </div>
        </div>

        {activeTab === 'upload' && (
          <>
            {/* Upload Area */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upload Your Content</CardTitle>
                <CardDescription>
                  Upload notes, slides, PDFs, or voice recordings to create AI-powered challenges
                </CardDescription>
              </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    {getFileIcon(getFileType(selectedFile))}
                    <span className="text-lg font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your files here, or{' '}
                      <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.txt,.doc,.docx,.mp3,.wav,.m4a,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: PDF, TXT, DOC, MP3, WAV, M4A, JPG, PNG
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Details Form */}
        {selectedFile && (
          <Card>
            <CardHeader>
              <CardTitle>File Details</CardTitle>
              <CardDescription>
                Add information about your learning material
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title *
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for this content"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject (optional)
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics, Biology, History"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">
                  Tags (optional)
                </label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags separated by commas (e.g., algebra, equations, chapter-3)"
                />
                <p className="text-xs text-gray-500">
                  Tags help organize your content and improve AI challenge generation
                </p>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <Button
                onClick={uploadFile}
                disabled={!title || uploading}
                className="w-full !bg-blue-600 !text-white hover:!bg-blue-700 disabled:!bg-blue-400 disabled:!text-white"
                variant="primary"
              >
                {uploading ? 'Uploading...' : 'Upload & Create Challenges'}
              </Button>
            </CardContent>
          </Card>
        )}
        </>
        )}

        {activeTab === 'write' && (
          <>
            {/* Markdown Editor */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Write Your Notes</CardTitle>
                <CardDescription>
                  Write your notes in markdown format to create AI-powered challenges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="markdown-content" className="text-sm font-medium">
                      Note Content (Markdown)
                    </label>
                    <textarea
                      id="markdown-content"
                      value={markdownContent}
                      onChange={(e) => setMarkdownContent(e.target.value)}
                      placeholder="# My Notes

## Key Concepts
- Point 1
- Point 2

### Important Formula
```
E = mc²
```

**Bold text** and *italic text*

&gt; This is a quote or important note"
                      className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Use markdown formatting: **bold**, *italic*, # headers, - lists, &gt; quotes, etc.
                    </p>
                  </div>

                  {/* Markdown Preview */}
                  {markdownContent && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preview</label>
                      <div className="border rounded-md p-4 bg-gray-50 max-h-64 overflow-y-auto">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: markdownContent
                              .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                              .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
                              .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                              .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 italic text-gray-700 my-2">$1</blockquote>')
                              .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
                              .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto"><code>$1</code></pre>')
                              .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
                              .replace(/\n\n/g, '</p><p class="mb-2">')
                              .replace(/^/, '<p class="mb-2">')
                              .replace(/$/, '</p>')
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Note Details Form for Markdown */}
            {markdownContent && (
              <Card>
                <CardHeader>
                  <CardTitle>Note Details</CardTitle>
                  <CardDescription>
                    Add information about your markdown notes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="title-markdown" className="text-sm font-medium">
                      Title *
                    </label>
                    <Input
                      id="title-markdown"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for this content"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subject-markdown" className="text-sm font-medium">
                      Subject (optional)
                    </label>
                    <Input
                      id="subject-markdown"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Mathematics, Biology, History"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tags-markdown" className="text-sm font-medium">
                      Tags (optional)
                    </label>
                    <Input
                      id="tags-markdown"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Enter tags separated by commas (e.g., algebra, equations, chapter-3)"
                    />
                    <p className="text-xs text-gray-500">
                      Tags help organize your content and improve AI challenge generation
                    </p>
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Saving...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={saveMarkdownNote}
                    disabled={!title || !markdownContent || uploading}
                    className="w-full !bg-blue-600 !text-white hover:!bg-blue-700 disabled:!bg-blue-400 disabled:!text-white"
                    variant="primary"
                  >
                    {uploading ? 'Saving...' : 'Save Notes & Create Challenges'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}