-- Optional advanced objects (run in MySQL Workbench or the mysql client, which understand DELIMITER)
USE LibraryDB;
DELIMITER //

-- Full borrowing history of one member
CREATE PROCEDURE sp_member_history(IN p_member INT)
BEGIN
  SELECT i.Issue_ID, b.Title, i.Issue_Date, i.Due_Date, i.Return_Date, IFNULL(f.Amount, 0) AS Fine
  FROM Issue i
  JOIN Book b ON b.Book_ID = i.Book_ID
  LEFT JOIN Fine f ON f.Issue_ID = i.Issue_ID
  WHERE i.Member_ID = p_member
  ORDER BY i.Issue_Date DESC;
END //

-- Safety net: stock can never go negative, even if someone edits the table by hand
CREATE TRIGGER trg_book_qty BEFORE UPDATE ON Book
FOR EACH ROW
BEGIN
  IF NEW.Quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;
END //

DELIMITER ;
