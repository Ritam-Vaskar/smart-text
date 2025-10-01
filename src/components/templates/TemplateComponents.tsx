// Supporting components for Templates - continue from Templates.tsx

// Supporting Components for Template Detail
function TemplateOverview({ template }: { template: Template }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Template Info</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Category:</span> <span className="ml-1 capitalize">{template.category}</span></div>
            <div><span className="text-gray-500">Language:</span> <span className="ml-1">{template.language.toUpperCase()}</span></div>
            <div><span className="text-gray-500">Tone:</span> <span className="ml-1 capitalize">{template.tone}</span></div>
            <div><span className="text-gray-500">Audience:</span> <span className="ml-1 capitalize">{template.audience}</span></div>
            {template.folder && (
              <div><span className="text-gray-500">Folder:</span> <span className="ml-1">{template.folder}</span></div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Usage Statistics</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Times Used:</span> <span className="ml-1 font-medium">{template.usage.timesUsed}</span></div>
            <div><span className="text-gray-500">Last Used:</span> <span className="ml-1">{template.usage.lastUsed ? new Date(template.usage.lastUsed).toLocaleDateString() : 'Never'}</span></div>
            <div><span className="text-gray-500">Average Rating:</span> <span className="ml-1">{template.usage.averageRating?.toFixed(1) || 'N/A'}</span></div>
            <div><span className="text-gray-500">Total Ratings:</span> <span className="ml-1">{template.usage.totalRatings}</span></div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Visibility:</span> <span className="ml-1">{template.isPublic ? 'Public' : 'Private'}</span></div>
            <div><span className="text-gray-500">Owner:</span> <span className="ml-1">{template.owner.name}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="ml-1">{new Date(template.createdAt).toLocaleDateString()}</span></div>
            <div><span className="text-gray-500">Updated:</span> <span className="ml-1">{new Date(template.updatedAt).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {template.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Placeholders */}
      {template.placeholders.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Available Placeholders</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {template.placeholders.map((placeholder, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {`{{${placeholder.name}}}`}
                  </code>
                  {placeholder.required && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{placeholder.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateContent({ template }: { template: Template }) {
  const [activeContentTab, setActiveContentTab] = useState('formatted');

  return (
    <div className="space-y-6">
      {/* Content Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveContentTab('formatted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeContentTab === 'formatted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Formatted View
          </button>
          <button
            onClick={() => setActiveContentTab('raw')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeContentTab === 'raw'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Content
          </button>
        </nav>
      </div>

      {activeContentTab === 'formatted' ? (
        <div className="space-y-4">
          {/* Subject */}
          {template.content.subject && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Subject</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{template.content.subject}</p>
              </div>
            </div>
          )}

          {/* Preheader */}
          {template.content.preheader && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preheader</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-sm">{template.content.preheader}</p>
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Body</h4>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: template.content.body.replace(/\n/g, '<br>') }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Raw Content Display */}
          {template.content.subject && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Subject (Raw)</h4>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                {template.content.subject}
              </pre>
            </div>
          )}
          
          {template.content.preheader && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preheader (Raw)</h4>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                {template.content.preheader}
              </pre>
            </div>
          )}
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Body (Raw)</h4>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {template.content.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}