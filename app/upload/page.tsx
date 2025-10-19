'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Headphones, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { Note } from '@/lib/types';
import { generateChallenges, extractContentFromFile } from '@/lib/ai-utils';
import Link from 'next/link';

function UploadContent() {
  const { userProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [dragActive, setDragActive] = useState(false);

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
              subject: subject || undefined,
              tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
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
                subject: subject || undefined,
                tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
                difficulty: 'medium',
                count: 5
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
            <h1 className="text-2xl font-bold text-gray-900">Upload Learning Materials</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                className="w-full"
                variant="primary"
              >
                {uploading ? 'Uploading...' : 'Upload & Create Challenges'}
              </Button>
            </CardContent>
          </Card>
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