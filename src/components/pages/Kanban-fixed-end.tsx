        </div>
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={handleCloseDetail}
          onEdit={(v) => {
            handleCloseDetail()
            // Will implement edit modal later
          }}
        />
      )}
    </div>
  )
}
