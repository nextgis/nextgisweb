'''
Created on October 15, 2012
    
@author: michel
'''

class ExceptionReport():
    index = 0
    exceptions = []
    
    def add(self, exception):
        self.exceptions.append(exception)
    
    def __len__(self):
        return len(self.exceptions)

    def __iter__(self):
        self.index = 0
        return self
    
    def next(self):
        if self.index >= len(self):
            raise StopIteration
        exception = self.exceptions[self.index]
        self.index += 1
        return exception

    def get(self, index):
        return self.exceptions[index]
