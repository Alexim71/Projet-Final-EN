function paginate(array, page, pageSize) {
  const totalItems = array.length;
  const pageCount = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(page, pageCount);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: array.slice(start, end),
    pagination :{
       totalItems,
       pageCount,
       currentPage,
       pageSize
    } 
  };
}

module.exports = paginate;
