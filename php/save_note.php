<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $title = $data['title'] ?? 'Untitled Note';
    $content = $data['content'] ?? '';
    
    if (empty(trim($content))) {
        echo json_encode(['status' => 'error', 'message' => 'Content cannot be empty']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("INSERT INTO notes (title, content) VALUES (:title, :content)");
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':content', $content);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Note saved successfully', 'id' => $conn->lastInsertId()]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to save note']);
        }
    } catch(PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
?>
